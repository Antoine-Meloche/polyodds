use crate::{
    auth::{AuthUser, MaybeAuthUser},
    error::{AppError, AppResult},
    routes::models::markets::{
        Bet,
        BetResponse,
        CreateMarketRequest,
        Market,
        MarketHistoryResponse,
        MarketListQuery,
        MarketPool,
        MarketWithPools,
        MarketsResponse,
        PlaceBetRequest,
        ProbabilitySnapshot,
        ResolveMarketRequest,
        UpdateMarketRequest,
        UserPosition,
    },
    state::AppState,
};
use axum::{
    extract::{Path, Query, State},
    Json,
};
use sqlx::FromRow;
use uuid::Uuid;

use super::{
    ensure_community_member,
    is_community_admin_tx,
    is_community_member,
    is_community_member_tx,
    page_limit,
    page_offset,
};

pub async fn list_markets(
    State(state): State<AppState>,
    Query(query): Query<MarketListQuery>,
) -> AppResult<Json<MarketsResponse>> {
    let limit = page_limit(query.limit);
    let offset = page_offset(query.offset);
    let sort = query.sort.as_deref().unwrap_or("newest");

    let order_clause = match sort {
        "volume" => "COALESCE((SELECT SUM(amount) FROM bets b WHERE b.market_id = m.id), 0) DESC, m.created_at DESC",
        _ => "m.created_at DESC",
    };

    let sql = format!(
        "SELECT m.id, m.title, m.description, m.category_id, m.community_id, m.creator_id, m.outcomes, m.status,
            m.winning_outcome_index, m.created_at
         FROM markets m
         LEFT JOIN communities c ON c.id = m.community_id
         WHERE ($1::uuid IS NULL OR m.category_id = $1)
           AND ($2::uuid IS NULL OR m.community_id = $2)
           AND ($3::text IS NULL OR m.status = $3)
           AND ($4::text IS NULL OR m.title ILIKE '%' || $4 || '%')
           AND (c.id IS NULL OR c.is_private = FALSE)
         ORDER BY {}
         LIMIT $5 OFFSET $6",
        order_clause
    );

    let markets = sqlx::query_as::<_, Market>(&sql)
        .bind(query.category_id)
        .bind(query.community_id)
        .bind(query.status.clone())
        .bind(query.search.clone())
        .bind(limit)
        .bind(offset)
        .fetch_all(&state.pool)
        .await?;

    let (total,) = sqlx::query_as::<_, (i64,)>(
        "SELECT COUNT(*)
         FROM markets m
         LEFT JOIN communities c ON c.id = m.community_id
         WHERE ($1::uuid IS NULL OR m.category_id = $1)
           AND ($2::uuid IS NULL OR m.community_id = $2)
           AND ($3::text IS NULL OR m.status = $3)
           AND ($4::text IS NULL OR m.title ILIKE '%' || $4 || '%')
           AND (c.id IS NULL OR c.is_private = FALSE)",
    )
    .bind(query.category_id)
    .bind(query.community_id)
    .bind(query.status)
    .bind(query.search)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(MarketsResponse { markets, total }))
}

#[derive(FromRow)]
struct MarketRow {
    id: Uuid,
    title: String,
    description: String,
    category_id: Uuid,
    community_id: Option<Uuid>,
    creator_id: Uuid,
    outcomes: Vec<String>,
    status: String,
    winning_outcome_index: Option<i32>,
    created_at: chrono::DateTime<chrono::Utc>,
    pools: Vec<i64>,
    community_private: Option<bool>,
}

pub async fn get_market(
    State(state): State<AppState>,
    maybe_auth: MaybeAuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<Json<MarketWithPools>> {
    let maybe_auth_user = maybe_auth.0;

    let row = sqlx::query_as::<_, MarketRow>(
        "SELECT m.id, m.title, m.description, m.category_id, m.community_id, m.creator_id,
            m.outcomes, m.status, m.winning_outcome_index, m.created_at,
                m.pools, c.is_private AS community_private
         FROM markets m
         LEFT JOIN communities c ON c.id = m.community_id
         WHERE m.id = $1",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    if row.community_private.unwrap_or(false) {
        let auth = maybe_auth_user.as_ref().ok_or(AppError::Unauthorized)?;
        let is_member = is_community_member(&state, auth.user_id, row.community_id.unwrap()).await?;
        if !is_member {
            return Err(AppError::Forbidden);
        }
    }

    let total_volume: i64 = row.pools.iter().sum();
    let pools = row
        .outcomes
        .iter()
        .enumerate()
        .map(|(idx, outcome)| {
            let amount = *row.pools.get(idx).unwrap_or(&0);
            let probability = if total_volume > 0 {
                amount as f64 / total_volume as f64
            } else {
                0.0
            };
            MarketPool {
                outcome: outcome.clone(),
                total_points: amount,
                probability,
            }
        })
        .collect::<Vec<_>>();

    let user_position = if let Some(auth) = maybe_auth_user {
        sqlx::query_as::<_, (i32, i64)>(
            "SELECT outcome_index, SUM(amount)::bigint AS amount
             FROM bets
             WHERE market_id = $1 AND user_id = $2
             GROUP BY outcome_index
             ORDER BY amount DESC
             LIMIT 1",
        )
        .bind(row.id)
        .bind(auth.user_id)
        .fetch_optional(&state.pool)
        .await?
        .map(|p| UserPosition {
            outcome_index: p.0,
            amount: p.1,
        })
    } else {
        None
    };

    let market = Market {
        id: row.id,
        title: row.title,
        description: row.description,
        category_id: row.category_id,
        community_id: row.community_id,
        creator_id: row.creator_id,
        outcomes: row.outcomes,
        status: row.status,
        winning_outcome_index: row.winning_outcome_index,
        created_at: row.created_at,
    };

    Ok(Json(MarketWithPools {
        market,
        pools,
        total_volume,
        user_position,
    }))
}

pub async fn create_market(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(payload): Json<CreateMarketRequest>,
) -> AppResult<Json<Market>> {
    if payload.outcomes.len() < 2 {
        return Err(AppError::Validation("Market needs at least two outcomes".to_string()));
    }

    if let Some(community_id) = payload.community_id {
        let allowed = is_community_member(&state, auth.user_id, community_id).await?;
        if !allowed {
            return Err(AppError::Forbidden);
        }
    }

    let pools = vec![0_i64; payload.outcomes.len()];

    let market = sqlx::query_as::<_, Market>(
        "INSERT INTO markets (title, description, category_id, community_id, creator_id, outcomes, status, pools)
         VALUES ($1, $2, $3, $4, $5, $6, 'ouvert', $7)
         RETURNING id, title, description, category_id, community_id, creator_id, outcomes, status,
                   winning_outcome_index, created_at",
    )
    .bind(payload.title.trim())
    .bind(payload.description.trim())
    .bind(payload.category_id)
    .bind(payload.community_id)
    .bind(auth.user_id)
    .bind(payload.outcomes)
    .bind(pools)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(market))
}

pub async fn update_market(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateMarketRequest>,
) -> AppResult<Json<Market>> {
    let market = sqlx::query_as::<_, Market>(
        "SELECT id, title, description, category_id, community_id, creator_id, outcomes, status,
                winning_outcome_index, created_at
         FROM markets WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    if market.creator_id != auth.user_id {
        return Err(AppError::Forbidden);
    }
    if market.status != "open" {
        return Err(AppError::BadRequest("Only open markets can be edited".to_string()));
    }

    let updated = sqlx::query_as::<_, Market>(
        "UPDATE markets
         SET title = COALESCE($2, title),
             description = COALESCE($3, description),
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, title, description, category_id, community_id, creator_id, outcomes, status,
                   winning_outcome_index, created_at",
    )
    .bind(id)
    .bind(payload.title)
    .bind(payload.description)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(updated))
}

pub async fn resolve_market(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
    Json(payload): Json<ResolveMarketRequest>,
) -> AppResult<Json<Market>> {
    let mut tx = state.pool.begin().await?;

    let row = sqlx::query_as::<_, MarketRow>(
        "SELECT m.id, m.title, m.description, m.category_id, m.community_id, m.creator_id,
            m.outcomes, m.status, m.winning_outcome_index, m.created_at,
                m.pools, c.is_private AS community_private
         FROM markets m
         LEFT JOIN communities c ON c.id = m.community_id
         WHERE m.id = $1
            FOR UPDATE OF m",
    )
    .bind(id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(AppError::NotFound)?;

    let mut can_resolve = row.creator_id == auth.user_id;
    if let Some(community_id) = row.community_id {
        can_resolve = can_resolve || is_community_admin_tx(&mut tx, auth.user_id, community_id).await?;
    }
    if !can_resolve {
        return Err(AppError::Forbidden);
    }
    if row.status == "resolved" {
        return Err(AppError::BadRequest("Market already resolved".to_string()));
    }
    if payload.winning_outcome_index < 0
        || payload.winning_outcome_index as usize >= row.outcomes.len()
    {
        return Err(AppError::Validation("Invalid winning_outcome_index".to_string()));
    }

    let total_pool: i64 = row.pools.iter().sum();
    let winning_pool = *row.pools.get(payload.winning_outcome_index as usize).unwrap_or(&0);

    sqlx::query(
        "UPDATE markets
         SET status = 'fermé', winning_outcome_index = $2, updated_at = NOW()
         WHERE id = $1",
    )
    .bind(id)
    .bind(payload.winning_outcome_index)
    .execute(&mut *tx)
    .await?;

    if total_pool > 0 && winning_pool > 0 {
        let winners = sqlx::query_as::<_, (Uuid, i64)>(
            "SELECT user_id, SUM(amount)::bigint AS stake
             FROM bets
             WHERE market_id = $1 AND outcome_index = $2
             GROUP BY user_id",
        )
        .bind(id)
        .bind(payload.winning_outcome_index)
        .fetch_all(&mut *tx)
        .await?;

        for (user_id, stake) in winners {
            let payout = ((stake as f64 / winning_pool as f64) * total_pool as f64).round() as i64;
            sqlx::query("UPDATE users SET points = points + $2, updated_at = NOW() WHERE id = $1")
                .bind(user_id)
                .bind(payout)
                .execute(&mut *tx)
                .await?;
        }
    }

    tx.commit().await?;

    let resolved = sqlx::query_as::<_, Market>(
        "SELECT id, title, description, category_id, community_id, creator_id, outcomes, status,
                winning_outcome_index, created_at
         FROM markets WHERE id = $1",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(resolved))
}

pub async fn market_history(
    State(state): State<AppState>,
    maybe_auth: MaybeAuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<Json<MarketHistoryResponse>> {
    let market = sqlx::query_as::<_, (Option<Uuid>, Option<bool>)>(
        "SELECT m.community_id, c.is_private
         FROM markets m
         LEFT JOIN communities c ON c.id = m.community_id
         WHERE m.id = $1",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    if market.1.unwrap_or(false) {
        let auth = maybe_auth.0.ok_or(AppError::Unauthorized)?;
        let community_id = market.0.ok_or(AppError::Forbidden)?;
        ensure_community_member(&state, auth.user_id, community_id).await?;
    }

    let history = sqlx::query_as::<_, ProbabilitySnapshot>(
        "SELECT recorded_at, probabilities
         FROM probability_snapshots
         WHERE market_id = $1
         ORDER BY recorded_at ASC",
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(MarketHistoryResponse { history }))
}

pub async fn market_bets_for_me(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<Json<serde_json::Value>> {
    let bets = sqlx::query_as::<_, Bet>(
        "SELECT id, market_id, user_id, outcome_index, amount, created_at
         FROM bets
         WHERE market_id = $1 AND user_id = $2
         ORDER BY created_at DESC",
    )
    .bind(id)
    .bind(auth.user_id)
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(serde_json::json!({ "bets": bets })))
}

pub async fn place_bet(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
    Json(payload): Json<PlaceBetRequest>,
) -> AppResult<Json<BetResponse>> {
    if payload.amount <= 0 {
        return Err(AppError::Validation("amount must be > 0".to_string()));
    }

    let mut tx = state.pool.begin().await?;

    let row = sqlx::query_as::<_, MarketRow>(
        "SELECT m.id, m.title, m.description, m.category_id, m.community_id, m.creator_id,
            m.outcomes, m.status, m.winning_outcome_index, m.created_at,
                m.pools, c.is_private AS community_private
         FROM markets m
         LEFT JOIN communities c ON c.id = m.community_id
         WHERE m.id = $1
            FOR UPDATE OF m",
    )
    .bind(id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(AppError::NotFound)?;

    if row.creator_id == auth.user_id {
        return Err(AppError::BadRequest(
            "Market creators cannot bet on their own market".to_string(),
        ));
    }

    if row.status != "open" {
        return Err(AppError::BadRequest("Market is not open".to_string()));
    }
    if payload.outcome_index < 0 || payload.outcome_index as usize >= row.outcomes.len() {
        return Err(AppError::Validation("Invalid outcome_index".to_string()));
    }

    if let Some(community_id) = row.community_id {
        let is_member = is_community_member_tx(&mut tx, auth.user_id, community_id).await?;
        if !is_member {
            return Err(AppError::Forbidden);
        }
    }

    let (points,) = sqlx::query_as::<_, (i64,)>("SELECT points FROM users WHERE id = $1 FOR UPDATE")
        .bind(auth.user_id)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or(AppError::Unauthorized)?;

    if points < payload.amount {
        return Err(AppError::BadRequest("Insufficient points".to_string()));
    }

    let (new_balance,) = sqlx::query_as::<_, (i64,)>(
        "UPDATE users
         SET points = points - $2, updated_at = NOW()
         WHERE id = $1
         RETURNING points",
    )
    .bind(auth.user_id)
    .bind(payload.amount)
    .fetch_one(&mut *tx)
    .await?;

    let bet = sqlx::query_as::<_, Bet>(
        "INSERT INTO bets (market_id, user_id, outcome_index, amount)
         VALUES ($1, $2, $3, $4)
         RETURNING id, market_id, user_id, outcome_index, amount, created_at",
    )
    .bind(id)
    .bind(auth.user_id)
    .bind(payload.outcome_index)
    .bind(payload.amount)
    .fetch_one(&mut *tx)
    .await?;

    let mut pools = row.pools;
    let idx = payload.outcome_index as usize;
    pools[idx] += payload.amount;

    sqlx::query("UPDATE markets SET pools = $2, updated_at = NOW() WHERE id = $1")
        .bind(id)
        .bind(pools.clone())
        .execute(&mut *tx)
        .await?;

    let total: i64 = pools.iter().sum();
    let probabilities_after = pools
        .iter()
        .map(|v| if total > 0 { *v as f64 / total as f64 } else { 0.0 })
        .collect::<Vec<_>>();

    sqlx::query(
        "INSERT INTO probability_snapshots (market_id, probabilities)
         VALUES ($1, $2)",
    )
    .bind(id)
    .bind(probabilities_after.clone())
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Json(BetResponse {
        bet,
        new_balance,
        probabilities_after,
    }))
}
