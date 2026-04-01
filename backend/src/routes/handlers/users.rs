use crate::{
    error::{AppError, AppResult},
    routes::models::{
        markets::Bet,
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
    Json,
};
use uuid::Uuid;

use super::{page_limit, page_offset};

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
