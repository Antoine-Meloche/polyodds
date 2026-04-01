use crate::{
    auth::AuthUser,
    error::{AppError, AppResult},
    routes::models::{
        markets::{Bet, MarketRealtimeEvent},
        users::{
            BetsResponse,
            LeaderboardEntry,
            LeaderboardResponse,
            PaginationQuery,
            User,
            UserBetsQuery,
            UserStats,
            UserWithStats,
        },
    },
    state::AppState,
};
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use sqlx::FromRow;
use uuid::Uuid;

use super::{page_limit, page_offset};

const STATUS_OPEN: &str = "open";
const STATUS_RESOLVED: &str = "resolved";
const KIND_RESOLVED: &str = "resolved";

#[derive(FromRow)]
struct CreatorMarketRow {
    id: Uuid,
    outcomes: Vec<String>,
    pools: Vec<i64>,
}

#[derive(FromRow)]
struct MarketPositionRow {
    user_id: Uuid,
    outcome_index: i32,
    shares: i64,
}

pub async fn get_user(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<UserWithStats>> {
    let user = sqlx::query_as::<_, User>(
        "SELECT id, username, points, created_at, last_claim_at
         FROM users
         WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    let stats = sqlx::query_as::<_, UserStats>(
        "SELECT
             (SELECT COUNT(*) FROM markets WHERE creator_id = $1) AS markets_created,
             (SELECT COUNT(*) FROM bets WHERE user_id = $1) AS bets_placed,
             (
                 SELECT COUNT(*)
                 FROM bets b
                 JOIN markets m ON m.id = b.market_id
                 WHERE b.user_id = $1
                 AND m.status = 'resolved'
                   AND m.winning_outcome_index = b.outcome_index
             ) AS bets_won",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(UserWithStats { user, stats }))
}

pub async fn get_user_bets(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Query(query): Query<UserBetsQuery>,
) -> AppResult<Json<BetsResponse>> {
    let limit = page_limit(query.limit);
    let offset = page_offset(query.offset);

    let bets = sqlx::query_as::<_, Bet>(
        "SELECT b.id, b.market_id, b.user_id, b.outcome_index, b.amount, b.side, b.created_at
         FROM bets b
         JOIN markets m ON m.id = b.market_id
         WHERE b.user_id = $1
                     AND ($2::text IS NULL OR ($2 = 'open' AND m.status = 'open') OR ($2 = 'resolved' AND m.status = 'resolved'))
         ORDER BY b.created_at DESC
         LIMIT $3 OFFSET $4",
    )
    .bind(id)
    .bind(query.status.clone())
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.pool)
    .await?;

    let (total,) = sqlx::query_as::<_, (i64,)>(
        "SELECT COUNT(*)
         FROM bets b
         JOIN markets m ON m.id = b.market_id
         WHERE b.user_id = $1
                     AND ($2::text IS NULL OR ($2 = 'open' AND m.status = 'open') OR ($2 = 'resolved' AND m.status = 'resolved'))",
    )
    .bind(id)
    .bind(query.status)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(BetsResponse { bets, total }))
}

pub async fn leaderboard(
    State(state): State<AppState>,
    Query(query): Query<PaginationQuery>,
) -> AppResult<Json<LeaderboardResponse>> {
    let limit = page_limit(query.limit);
    let offset = page_offset(query.offset);

    let users = sqlx::query_as::<_, LeaderboardEntry>(
        "SELECT * FROM (
             SELECT
                 ROW_NUMBER() OVER (ORDER BY points DESC, created_at ASC) AS rank,
                 id,
                 username,
                 points
             FROM users
         ) ranked
         ORDER BY rank
         LIMIT $1 OFFSET $2",
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.pool)
    .await?;

    let (total,) = sqlx::query_as::<_, (i64,)>("SELECT COUNT(*) FROM users")
        .fetch_one(&state.pool)
        .await?;

    Ok(Json(LeaderboardResponse { users, total }))
}

pub async fn delete_me(
    State(state): State<AppState>,
    auth: AuthUser,
) -> AppResult<StatusCode> {
    let mut tx = state.pool.begin().await?;

    let user_exists = sqlx::query_as::<_, (Uuid,)>("SELECT id FROM users WHERE id = $1 FOR UPDATE")
        .bind(auth.user_id)
        .fetch_optional(&mut *tx)
        .await?;

    if user_exists.is_none() {
        return Err(AppError::NotFound);
    }

    let markets_to_close = sqlx::query_as::<_, CreatorMarketRow>(
        "SELECT id, outcomes, pools
         FROM markets
         WHERE creator_id = $1 AND status = $2
         FOR UPDATE",
    )
    .bind(auth.user_id)
    .bind(STATUS_OPEN)
    .fetch_all(&mut *tx)
    .await?;

    let mut resolved_events = Vec::with_capacity(markets_to_close.len());

    for market in markets_to_close {
        let positions = sqlx::query_as::<_, MarketPositionRow>(
            "SELECT user_id, outcome_index, shares
             FROM market_positions
             WHERE market_id = $1 AND shares > 0
             ORDER BY outcome_index ASC, user_id ASC
             FOR UPDATE",
        )
        .bind(market.id)
        .fetch_all(&mut *tx)
        .await?;

        for (outcome_index, pool_amount) in market.pools.iter().copied().enumerate() {
            if pool_amount <= 0 {
                continue;
            }

            let outcome_positions = positions
                .iter()
                .filter(|position| position.outcome_index == outcome_index as i32)
                .collect::<Vec<_>>();

            let total_shares: i64 = outcome_positions.iter().map(|position| position.shares).sum();
            if total_shares <= 0 {
                continue;
            }

            let mut distributed = 0_i64;
            let last_index = outcome_positions.len().saturating_sub(1);

            for (position_index, position) in outcome_positions.iter().enumerate() {
                let payout = if position_index == last_index {
                    pool_amount - distributed
                } else {
                    let amount = (pool_amount * position.shares) / total_shares;
                    distributed += amount;
                    amount
                };

                if payout > 0 && position.user_id != auth.user_id {
                    sqlx::query(
                        "UPDATE users SET points = points + $2, updated_at = NOW() WHERE id = $1",
                    )
                    .bind(position.user_id)
                    .bind(payout)
                    .execute(&mut *tx)
                    .await?;
                }
            }
        }

        sqlx::query("DELETE FROM market_positions WHERE market_id = $1")
            .bind(market.id)
            .execute(&mut *tx)
            .await?;

        let zero_pools = vec![0_i64; market.outcomes.len()];

        sqlx::query(
            "UPDATE markets
             SET status = $2,
                 winning_outcome_index = NULL,
                 creator_id = NULL,
                 pools = $3,
                 updated_at = NOW()
             WHERE id = $1",
        )
        .bind(market.id)
        .bind(STATUS_RESOLVED)
        .bind(zero_pools.clone())
        .execute(&mut *tx)
        .await?;

        resolved_events.push(MarketRealtimeEvent {
            market_id: market.id,
            kind: KIND_RESOLVED.to_string(),
            status: STATUS_RESOLVED.to_string(),
            pools: zero_pools,
            probabilities: vec![0.0; market.outcomes.len()],
            total_volume: 0,
        });
    }

    sqlx::query("UPDATE markets SET creator_id = NULL, updated_at = NOW() WHERE creator_id = $1")
        .bind(auth.user_id)
        .execute(&mut *tx)
        .await?;

    let deleted = sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(auth.user_id)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;

    for event in resolved_events {
        let _ = state.market_events.send(event);
    }

    if deleted.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    Ok(StatusCode::NO_CONTENT)
}
