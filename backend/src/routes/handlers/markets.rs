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
        MarketRealtimeEvent,
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
    extract::{Path, Query, State, WebSocketUpgrade, ws::Message},
    response::IntoResponse,
    Json,
};
use sqlx::FromRow;
use tokio::sync::broadcast;
use uuid::Uuid;

use super::{
    ensure_community_member,
    is_community_admin_tx,
    is_community_member,
    is_community_member_tx,
    page_limit,
    page_offset,
};

const INITIAL_POOL_POINTS_PER_OUTCOME: i64 = 500;
const SPREAD_BPS: f64 = 150.0;
const MIN_PRICE: f64 = 0.01;

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

fn probabilities_from_pools(pools: &[i64]) -> Vec<f64> {
    let total: i64 = pools.iter().sum();
    pools
        .iter()
        .map(|v| if total > 0 { *v as f64 / total as f64 } else { 0.0 })
        .collect::<Vec<_>>()
}

fn quote_ask_price(pools: &[i64], outcome_index: usize, points_in: i64) -> f64 {
    let total = pools.iter().sum::<i64>().max(1) as f64;
    let base = (pools.get(outcome_index).copied().unwrap_or(0).max(1) as f64) / total;
    let spread = SPREAD_BPS / 10_000.0;
    let impact = (points_in.max(1) as f64) / total;
    (base * (1.0 + spread / 2.0 + impact)).max(MIN_PRICE)
}

fn quote_bid_price(pools: &[i64], outcome_index: usize, shares_out: i64) -> f64 {
    let total = pools.iter().sum::<i64>().max(1) as f64;
    let base = (pools.get(outcome_index).copied().unwrap_or(0).max(1) as f64) / total;
    let spread = SPREAD_BPS / 10_000.0;
    let impact = (shares_out.max(1) as f64) / total;
    (base * (1.0 - spread / 2.0 - impact)).max(MIN_PRICE)
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
            "SELECT outcome_index, shares
             FROM market_positions
             WHERE market_id = $1 AND user_id = $2
             ORDER BY shares DESC
             LIMIT 1",
        )
        .bind(row.id)
        .bind(auth.user_id)
        .fetch_optional(&state.pool)
        .await?
        .map(|p| UserPosition {
            outcome_index: p.0,
            shares: p.1,
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

    let pools = vec![INITIAL_POOL_POINTS_PER_OUTCOME; payload.outcomes.len()];

    let market = sqlx::query_as::<_, Market>(
        "INSERT INTO markets (title, description, category_id, community_id, creator_id, outcomes, status, pools)
         VALUES ($1, $2, $3, $4, $5, $6, 'open', $7)
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
            SET status = 'resolved', winning_outcome_index = $2, updated_at = NOW()
         WHERE id = $1",
    )
    .bind(id)
    .bind(payload.winning_outcome_index)
    .execute(&mut *tx)
    .await?;

    if total_pool > 0 && winning_pool > 0 {
        let winners = sqlx::query_as::<_, (Uuid, i64)>(
            "SELECT user_id, shares AS stake
             FROM market_positions
             WHERE market_id = $1 AND outcome_index = $2 AND shares > 0",
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

    let probabilities = probabilities_from_pools(&row.pools);
    let _ = state.market_events.send(MarketRealtimeEvent {
        market_id: id,
        kind: "resolved".to_string(),
        status: "resolved".to_string(),
        pools: row.pools.clone(),
        total_volume: row.pools.iter().sum(),
        probabilities,
    });

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
        "SELECT id, market_id, user_id, outcome_index, amount, side, created_at
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

    let side = payload.side.unwrap_or_else(|| "buy".to_string());
    if side != "buy" && side != "sell" {
        return Err(AppError::Validation("side must be either 'buy' or 'sell'".to_string()));
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

    let current_shares = sqlx::query_as::<_, (i64,)>(
        "SELECT shares FROM market_positions WHERE market_id = $1 AND user_id = $2 AND outcome_index = $3",
    )
    .bind(id)
    .bind(auth.user_id)
    .bind(payload.outcome_index)
    .fetch_optional(&mut *tx)
    .await?
    .map(|row| row.0)
    .unwrap_or(0);

    let mut pools = row.pools;
    let idx = payload.outcome_index as usize;

    let new_balance = if side == "buy" {
        if points < payload.amount {
            return Err(AppError::BadRequest("Insufficient points".to_string()));
        }
        let ask_price = quote_ask_price(&pools, idx, payload.amount);
        let minted_shares = ((payload.amount as f64) / ask_price).floor() as i64;
        if minted_shares <= 0 {
            return Err(AppError::BadRequest("Trade amount too small at current price".to_string()));
        }

        pools[idx] += payload.amount;

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

        sqlx::query(
            "INSERT INTO market_positions (market_id, user_id, outcome_index, shares)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (market_id, user_id, outcome_index)
             DO UPDATE SET shares = market_positions.shares + EXCLUDED.shares, updated_at = NOW()",
        )
        .bind(id)
        .bind(auth.user_id)
        .bind(payload.outcome_index)
        .bind(minted_shares)
        .execute(&mut *tx)
        .await?;

        new_balance
    } else {
        let shares_to_sell = payload.amount;
        if current_shares < shares_to_sell {
            return Err(AppError::BadRequest("Insufficient shares to sell".to_string()));
        }

        let bid_price = quote_bid_price(&pools, idx, shares_to_sell);
        let payout_points = ((shares_to_sell as f64) * bid_price).floor() as i64;
        if payout_points <= 0 {
            return Err(AppError::BadRequest("Sell amount too small at current price".to_string()));
        }
        if pools[idx] < payout_points {
            return Err(AppError::BadRequest("Not enough liquidity in selected outcome pool".to_string()));
        }
        pools[idx] -= payout_points;

        let (new_balance,) = sqlx::query_as::<_, (i64,)>(
            "UPDATE users
             SET points = points + $2, updated_at = NOW()
             WHERE id = $1
             RETURNING points",
        )
        .bind(auth.user_id)
        .bind(payout_points)
        .fetch_one(&mut *tx)
        .await?;

        sqlx::query(
            "UPDATE market_positions
             SET shares = shares - $4, updated_at = NOW()
             WHERE market_id = $1 AND user_id = $2 AND outcome_index = $3",
        )
        .bind(id)
        .bind(auth.user_id)
        .bind(payload.outcome_index)
        .bind(shares_to_sell)
        .execute(&mut *tx)
        .await?;

        sqlx::query(
            "DELETE FROM market_positions
             WHERE market_id = $1 AND user_id = $2 AND outcome_index = $3 AND shares <= 0",
        )
        .bind(id)
        .bind(auth.user_id)
        .bind(payload.outcome_index)
        .execute(&mut *tx)
        .await?;

        new_balance
    };

    let bet = sqlx::query_as::<_, Bet>(
        "INSERT INTO bets (market_id, user_id, outcome_index, amount, side)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, market_id, user_id, outcome_index, amount, side, created_at",
    )
    .bind(id)
    .bind(auth.user_id)
    .bind(payload.outcome_index)
    .bind(payload.amount)
    .bind(&side)
    .fetch_one(&mut *tx)
    .await?;

    sqlx::query("UPDATE markets SET pools = $2, updated_at = NOW() WHERE id = $1")
        .bind(id)
        .bind(pools.clone())
        .execute(&mut *tx)
        .await?;

    let probabilities_after = probabilities_from_pools(&pools);

    sqlx::query(
        "INSERT INTO probability_snapshots (market_id, probabilities)
         VALUES ($1, $2)",
    )
    .bind(id)
    .bind(probabilities_after.clone())
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    let _ = state.market_events.send(MarketRealtimeEvent {
        market_id: id,
        kind: "trade".to_string(),
        status: row.status,
        pools: pools.clone(),
        total_volume: pools.iter().sum(),
        probabilities: probabilities_after.clone(),
    });

    Ok(Json(BetResponse {
        bet,
        new_balance,
        probabilities_after,
    }))
}

pub async fn market_ws(
    State(state): State<AppState>,
    maybe_auth: MaybeAuthUser,
    Path(id): Path<Uuid>,
    ws: WebSocketUpgrade,
) -> AppResult<impl IntoResponse> {
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

    let mut rx = state.market_events.subscribe();
    Ok(ws.on_upgrade(move |mut socket| async move {
        loop {
            tokio::select! {
                incoming = socket.recv() => {
                    match incoming {
                        Some(Ok(Message::Close(_))) | None | Some(Err(_)) => break,
                        _ => {}
                    }
                }
                event = rx.recv() => {
                    match event {
                        Ok(payload) if payload.market_id == id => {
                            if let Ok(text) = serde_json::to_string(&payload) {
                                if socket.send(Message::Text(text)).await.is_err() {
                                    break;
                                }
                            }
                        }
                        Ok(_) => {}
                        Err(broadcast::error::RecvError::Lagged(_)) => {}
                        Err(broadcast::error::RecvError::Closed) => break,
                    }
                }
            }
        }
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::extract::State;
    use sqlx::postgres::PgPoolOptions;

    fn test_state() -> AppState {
        let (market_events, _) = tokio::sync::broadcast::channel(32);
        AppState {
            pool: PgPoolOptions::new()
                .connect_lazy("postgres://local:local@localhost:5432/local")
                .expect("lazy pool should be created"),
            jwt_secret: "abcdefghijklmnopqrstuvwxyz123456".to_string(),
            market_events,
        }
    }

    #[tokio::test]
    async fn create_market_rejects_less_than_two_outcomes_before_db_call() {
        let state = test_state();
        let auth = AuthUser {
            user_id: Uuid::new_v4(),
        };
        let payload = CreateMarketRequest {
            title: "Will it rain?".to_string(),
            description: "Weather market".to_string(),
            category_id: Uuid::new_v4(),
            community_id: None,
            outcomes: vec!["Yes".to_string()],
        };

        let result = create_market(State(state), auth, Json(payload)).await;
        assert!(matches!(result, Err(AppError::Validation(_))));
    }

    #[tokio::test]
    async fn place_bet_rejects_non_positive_amount_before_db_call() {
        let state = test_state();
        let auth = AuthUser {
            user_id: Uuid::new_v4(),
        };
        let payload = PlaceBetRequest {
            outcome_index: 0,
            amount: 0,
            side: None,
        };

        let result = place_bet(State(state), auth, Path(Uuid::new_v4()), Json(payload)).await;
        assert!(matches!(result, Err(AppError::Validation(_))));
    }
}
