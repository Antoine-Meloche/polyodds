use crate::{
    auth::{encode_token, hash_password, validate_password, validate_username, verify_password, AuthUser, MaybeAuthUser},
    error::{AppError, AppResult},
    models::*,
    state::AppState,
};
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use chrono::{Duration, Utc};
use serde::Serialize;
use sqlx::{FromRow, Postgres, Transaction};
use uuid::Uuid;

fn page_limit(limit: Option<i64>) -> i64 {
    limit.unwrap_or(20).clamp(1, 100)
}

fn page_offset(offset: Option<i64>) -> i64 {
    offset.unwrap_or(0).max(0)
}

#[derive(FromRow)]
struct AuthUserRow {
    id: Uuid,
    username: String,
    password_hash: String,
    points: i64,
    created_at: chrono::DateTime<chrono::Utc>,
    last_claim_at: Option<chrono::DateTime<chrono::Utc>>,
}

impl From<AuthUserRow> for User {
    fn from(value: AuthUserRow) -> Self {
        Self {
            id: value.id,
            username: value.username,
            points: value.points,
            created_at: value.created_at,
            last_claim_at: value.last_claim_at,
        }
    }
}

pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<RegisterRequest>,
) -> AppResult<Json<AuthResponse>> {
    if !validate_username(&payload.username) {
        return Err(AppError::Validation("Username must be 3-32 chars".to_string()));
    }
    if !validate_password(&payload.password) {
        return Err(AppError::Validation("Password must be at least 8 chars".to_string()));
    }

    let password_hash = hash_password(&payload.password)?;
    let generated_email = format!("{}@local.polyodds", payload.username.trim());

    let inserted = sqlx::query_as::<_, AuthUserRow>(
        "INSERT INTO users (username, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, username, password_hash, points, created_at, last_claim_at",
    )
    .bind(payload.username.trim())
    .bind(generated_email)
    .bind(password_hash)
    .fetch_one(&state.pool)
    .await
    .map_err(|e| match &e {
        sqlx::Error::Database(db_err) if db_err.code().as_deref() == Some("23505") => {
            AppError::Conflict("Username already exists".to_string())
        }
        _ => AppError::Db(e),
    })?;

    let user: User = inserted.into();
    let token = encode_token(user.id, &state.jwt_secret)?;

    Ok(Json(AuthResponse { token, user }))
}

pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> AppResult<Json<AuthResponse>> {
    let auth_user = sqlx::query_as::<_, AuthUserRow>(
        "SELECT id, username, password_hash, points, created_at, last_claim_at
         FROM users
         WHERE username = $1",
    )
    .bind(payload.username.trim())
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::Unauthorized)?;

    let valid = verify_password(&payload.password, &auth_user.password_hash)?;
    if !valid {
        return Err(AppError::Unauthorized);
    }

    let user: User = auth_user.into();
    let token = encode_token(user.id, &state.jwt_secret)?;

    Ok(Json(AuthResponse { token, user }))
}

pub async fn me(State(state): State<AppState>, auth: AuthUser) -> AppResult<Json<User>> {
    let user = sqlx::query_as::<_, User>(
        "SELECT id, username, points, created_at, last_claim_at
         FROM users
         WHERE id = $1",
    )
    .bind(auth.user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::Unauthorized)?;

    Ok(Json(user))
}

#[derive(Serialize)]
struct DailyClaimConflict {
    error: String,
    next_claim_at: chrono::DateTime<chrono::Utc>,
}

pub async fn daily_claim(
    State(state): State<AppState>,
    auth: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    let now = Utc::now();

    let row = sqlx::query_as::<_, (i64, Option<chrono::DateTime<chrono::Utc>>)>(
        "SELECT points, last_claim_at FROM users WHERE id = $1",
    )
    .bind(auth.user_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::Unauthorized)?;

    if let Some(last_claim_at) = row.1 {
        let next_claim_at = last_claim_at + Duration::hours(24);
        if now < next_claim_at {
            return Ok((
                StatusCode::CONFLICT,
                Json(DailyClaimConflict {
                    error: "Already claimed today".to_string(),
                    next_claim_at,
                }),
            )
                .into_response());
        }
    }

    let updated = sqlx::query_as::<_, (i64, chrono::DateTime<chrono::Utc>)>(
        "UPDATE users
         SET points = points + 100, last_claim_at = NOW(), updated_at = NOW()
         WHERE id = $1
         RETURNING points, last_claim_at",
    )
    .bind(auth.user_id)
    .fetch_one(&state.pool)
    .await?;

    let body = DailyClaimResponse {
        points_earned: 100,
        new_balance: updated.0,
        next_claim_at: updated.1 + Duration::hours(24),
    };

    Ok((StatusCode::OK, Json(body)).into_response())
}

pub async fn list_categories(State(state): State<AppState>) -> AppResult<Json<CategoriesResponse>> {
    let categories = sqlx::query_as::<_, Category>(
        "SELECT id, name, slug FROM categories ORDER BY name ASC",
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(CategoriesResponse { categories }))
}

pub async fn create_category(
    State(state): State<AppState>,
    Json(payload): Json<CategoryCreateRequest>,
) -> AppResult<Json<Category>> {
    let category = sqlx::query_as::<_, Category>(
        "INSERT INTO categories (name, slug)
         VALUES ($1, $2)
         RETURNING id, name, slug",
    )
    .bind(payload.name.trim())
    .bind(payload.slug.trim().to_lowercase())
    .fetch_one(&state.pool)
    .await
    .map_err(|e| match &e {
        sqlx::Error::Database(db_err) if db_err.code().as_deref() == Some("23505") => {
            AppError::Conflict("Category slug already exists".to_string())
        }
        _ => AppError::Db(e),
    })?;

    Ok(Json(category))
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
        "SELECT b.id, b.market_id, b.user_id, b.outcome_index, b.amount, b.created_at
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

pub async fn list_markets(
    State(state): State<AppState>,
    Query(query): Query<MarketListQuery>,
) -> AppResult<Json<MarketsResponse>> {
    let limit = page_limit(query.limit);
    let offset = page_offset(query.offset);
    let sort = query.sort.as_deref().unwrap_or("newest");

    let order_clause = match sort {
        "volume" => "COALESCE((SELECT SUM(amount) FROM bets b WHERE b.market_id = m.id), 0) DESC, m.created_at DESC",
        "closing_soon" => "m.close_at ASC, m.created_at DESC",
        _ => "m.created_at DESC",
    };

    let sql = format!(
        "SELECT m.id, m.title, m.description, m.category_id, m.community_id, m.creator_id, m.outcomes, m.status,
                m.winning_outcome_index, m.close_at, m.created_at
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
    close_at: chrono::DateTime<chrono::Utc>,
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
                m.outcomes, m.status, m.winning_outcome_index, m.close_at, m.created_at,
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
            "SELECT outcome_index, SUM(amount) AS amount
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
        close_at: row.close_at,
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
    if payload.close_at <= Utc::now() {
        return Err(AppError::Validation("close_at must be in the future".to_string()));
    }

    if let Some(community_id) = payload.community_id {
        let allowed = is_community_member(&state, auth.user_id, community_id).await?;
        if !allowed {
            return Err(AppError::Forbidden);
        }
    }

    let pools = vec![0_i64; payload.outcomes.len()];

    let market = sqlx::query_as::<_, Market>(
        "INSERT INTO markets (title, description, category_id, community_id, creator_id, outcomes, status, pools, close_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'open', $7, $8)
         RETURNING id, title, description, category_id, community_id, creator_id, outcomes, status,
                   winning_outcome_index, close_at, created_at",
    )
    .bind(payload.title.trim())
    .bind(payload.description.trim())
    .bind(payload.category_id)
    .bind(payload.community_id)
    .bind(auth.user_id)
    .bind(payload.outcomes)
    .bind(pools)
    .bind(payload.close_at)
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
                winning_outcome_index, close_at, created_at
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
             close_at = COALESCE($4, close_at),
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, title, description, category_id, community_id, creator_id, outcomes, status,
                   winning_outcome_index, close_at, created_at",
    )
    .bind(id)
    .bind(payload.title)
    .bind(payload.description)
    .bind(payload.close_at)
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
                m.outcomes, m.status, m.winning_outcome_index, m.close_at, m.created_at,
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
    if row.status != "closed" && Utc::now() < row.close_at {
        return Err(AppError::BadRequest(
            "Market must be closed before resolution".to_string(),
        ));
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
            "SELECT user_id, SUM(amount) AS stake
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
                winning_outcome_index, close_at, created_at
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
                m.outcomes, m.status, m.winning_outcome_index, m.close_at, m.created_at,
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

    if row.status != "open" {
        return Err(AppError::BadRequest("Market is not open".to_string()));
    }
    if Utc::now() > row.close_at {
        return Err(AppError::BadRequest("Market already closed by time".to_string()));
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

pub async fn list_communities(
    State(state): State<AppState>,
    Query(query): Query<CommunityListQuery>,
) -> AppResult<Json<CommunityListResponse>> {
    let limit = page_limit(query.limit);
    let offset = page_offset(query.offset);

    let communities = sqlx::query_as::<_, Community>(
        "SELECT id, name, description, is_private, creator_id, created_at
         FROM communities
         WHERE is_private = FALSE
           AND ($1::text IS NULL OR name ILIKE '%' || $1 || '%')
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3",
    )
    .bind(query.search.clone())
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.pool)
    .await?;

    let (total,) = sqlx::query_as::<_, (i64,)>(
        "SELECT COUNT(*)
         FROM communities
         WHERE is_private = FALSE
           AND ($1::text IS NULL OR name ILIKE '%' || $1 || '%')",
    )
    .bind(query.search)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(CommunityListResponse { communities, total }))
}

pub async fn get_community(
    State(state): State<AppState>,
    maybe_auth: MaybeAuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<Json<CommunityDetailResponse>> {
    let community = sqlx::query_as::<_, Community>(
        "SELECT id, name, description, is_private, creator_id, created_at
         FROM communities WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    let mut is_member = false;
    let mut role = None;

    if let Some(auth) = maybe_auth.0 {
        let membership = sqlx::query_as::<_, (String,)>(
            "SELECT role
             FROM community_members
             WHERE community_id = $1 AND user_id = $2",
        )
        .bind(id)
        .bind(auth.user_id)
        .fetch_optional(&state.pool)
        .await?;

        if let Some((r,)) = membership {
            is_member = true;
            role = Some(r);
        }
    }

    if community.is_private && !is_member {
        return Err(AppError::Forbidden);
    }

    let (member_count,) = sqlx::query_as::<_, (i64,)>(
        "SELECT COUNT(*) FROM community_members WHERE community_id = $1",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await?;

    let (market_count,) = sqlx::query_as::<_, (i64,)>(
        "SELECT COUNT(*) FROM markets WHERE community_id = $1",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(CommunityDetailResponse {
        community,
        member_count,
        market_count,
        is_member,
        role,
    }))
}

pub async fn create_community(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(payload): Json<CreateCommunityRequest>,
) -> AppResult<Json<Community>> {
    let mut tx = state.pool.begin().await?;

    let community = sqlx::query_as::<_, Community>(
        "INSERT INTO communities (name, description, is_private, creator_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, description, is_private, creator_id, created_at",
    )
    .bind(payload.name.trim())
    .bind(payload.description.trim())
    .bind(payload.is_private)
    .bind(auth.user_id)
    .fetch_one(&mut *tx)
    .await?;

    sqlx::query(
        "INSERT INTO community_members (community_id, user_id, role)
         VALUES ($1, $2, 'admin')",
    )
    .bind(community.id)
    .bind(auth.user_id)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Json(community))
}

pub async fn update_community(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateCommunityRequest>,
) -> AppResult<Json<Community>> {
    require_community_admin(&state, auth.user_id, id).await?;

    let community = sqlx::query_as::<_, Community>(
        "UPDATE communities
         SET name = COALESCE($2, name),
             description = COALESCE($3, description),
             is_private = COALESCE($4, is_private),
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, name, description, is_private, creator_id, created_at",
    )
    .bind(id)
    .bind(payload.name)
    .bind(payload.description)
    .bind(payload.is_private)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(Json(community))
}

pub async fn delete_community(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<StatusCode> {
    require_community_admin(&state, auth.user_id, id).await?;

    let deleted = sqlx::query("DELETE FROM communities WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await?;

    if deleted.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    Ok(StatusCode::NO_CONTENT)
}

pub async fn join_community(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<Json<RoleResponse>> {
    let (is_private,) = sqlx::query_as::<_, (bool,)>("SELECT is_private FROM communities WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(AppError::NotFound)?;

    if is_private {
        return Err(AppError::Forbidden);
    }

    sqlx::query(
        "INSERT INTO community_members (community_id, user_id, role)
         VALUES ($1, $2, 'member')
         ON CONFLICT (community_id, user_id) DO NOTHING",
    )
    .bind(id)
    .bind(auth.user_id)
    .execute(&state.pool)
    .await?;

    Ok(Json(RoleResponse {
        role: "member".to_string(),
    }))
}

pub async fn leave_community(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<StatusCode> {
    let mut tx = state.pool.begin().await?;

    let (is_private,) = sqlx::query_as::<_, (bool,)>("SELECT is_private FROM communities WHERE id = $1")
        .bind(id)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or(AppError::NotFound)?;

    let role = sqlx::query_as::<_, (String,)>(
        "SELECT role FROM community_members WHERE community_id = $1 AND user_id = $2",
    )
    .bind(id)
    .bind(auth.user_id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(AppError::Forbidden)?;

    if role.0 == "admin" && is_private {
        let (admin_count,) = sqlx::query_as::<_, (i64,)>(
            "SELECT COUNT(*) FROM community_members WHERE community_id = $1 AND role = 'admin'",
        )
        .bind(id)
        .fetch_one(&mut *tx)
        .await?;

        if admin_count <= 1 {
            return Err(AppError::BadRequest("Cannot leave as last admin".to_string()));
        }
    }

    sqlx::query("DELETE FROM community_members WHERE community_id = $1 AND user_id = $2")
        .bind(id)
        .bind(auth.user_id)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn community_members(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
    Query(query): Query<PaginationQuery>,
) -> AppResult<Json<CommunityMembersResponse>> {
    ensure_community_member(&state, auth.user_id, id).await?;

    let limit = page_limit(query.limit);
    let offset = page_offset(query.offset);

    let members = sqlx::query_as::<_, CommunityMember>(
        "SELECT cm.community_id, cm.user_id, cm.role, cm.joined_at
         FROM community_members cm
         WHERE cm.community_id = $1
         ORDER BY cm.joined_at ASC
         LIMIT $2 OFFSET $3",
    )
    .bind(id)
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.pool)
    .await?;

    let (total,) = sqlx::query_as::<_, (i64,)>(
        "SELECT COUNT(*) FROM community_members WHERE community_id = $1",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(CommunityMembersResponse { members, total }))
}

pub async fn invite_member(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
    Json(payload): Json<InviteMemberRequest>,
) -> AppResult<Json<CommunityMember>> {
    require_community_admin(&state, auth.user_id, id).await?;

    let member = sqlx::query_as::<_, CommunityMember>(
        "INSERT INTO community_members (community_id, user_id, role)
         VALUES ($1, $2, 'member')
         ON CONFLICT (community_id, user_id)
         DO UPDATE SET role = community_members.role
         RETURNING community_id, user_id, role, joined_at",
    )
    .bind(id)
    .bind(payload.user_id)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(member))
}

pub async fn community_markets(
    State(state): State<AppState>,
    maybe_auth: MaybeAuthUser,
    Path(id): Path<Uuid>,
    Query(query): Query<CommunityMarketsQuery>,
) -> AppResult<Json<MarketsResponse>> {
    let community = sqlx::query_as::<_, (bool,)>("SELECT is_private FROM communities WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(AppError::NotFound)?;

    if community.0 {
        let auth = maybe_auth.0.ok_or(AppError::Unauthorized)?;
        ensure_community_member(&state, auth.user_id, id).await?;
    }

    let limit = page_limit(query.limit);
    let offset = page_offset(query.offset);

    let markets = sqlx::query_as::<_, Market>(
        "SELECT id, title, description, category_id, community_id, creator_id, outcomes, status,
                winning_outcome_index, close_at, created_at
         FROM markets
         WHERE community_id = $1
           AND ($2::text IS NULL OR status = $2)
         ORDER BY created_at DESC
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
         FROM markets
         WHERE community_id = $1
           AND ($2::text IS NULL OR status = $2)",
    )
    .bind(id)
    .bind(query.status)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(MarketsResponse { markets, total }))
}

async fn ensure_community_member(state: &AppState, user_id: Uuid, community_id: Uuid) -> AppResult<()> {
    let is_member = is_community_member(state, user_id, community_id).await?;
    if !is_member {
        return Err(AppError::Forbidden);
    }
    Ok(())
}

async fn require_community_admin(state: &AppState, user_id: Uuid, community_id: Uuid) -> AppResult<()> {
    let is_admin = is_community_admin(state, user_id, community_id).await?;
    if !is_admin {
        return Err(AppError::Forbidden);
    }
    Ok(())
}

async fn is_community_member(state: &AppState, user_id: Uuid, community_id: Uuid) -> AppResult<bool> {
    let row = sqlx::query_as::<_, (i64,)>(
        "SELECT COUNT(*) FROM community_members WHERE community_id = $1 AND user_id = $2",
    )
    .bind(community_id)
    .bind(user_id)
    .fetch_one(&state.pool)
    .await?;

    Ok(row.0 > 0)
}

async fn is_community_admin(state: &AppState, user_id: Uuid, community_id: Uuid) -> AppResult<bool> {
    let row = sqlx::query_as::<_, (i64,)>(
        "SELECT COUNT(*)
         FROM community_members
         WHERE community_id = $1 AND user_id = $2 AND role = 'admin'",
    )
    .bind(community_id)
    .bind(user_id)
    .fetch_one(&state.pool)
    .await?;

    Ok(row.0 > 0)
}

async fn is_community_member_tx(
    tx: &mut Transaction<'_, Postgres>,
    user_id: Uuid,
    community_id: Uuid,
) -> AppResult<bool> {
    let row = sqlx::query_as::<_, (i64,)>(
        "SELECT COUNT(*) FROM community_members WHERE community_id = $1 AND user_id = $2",
    )
    .bind(community_id)
    .bind(user_id)
    .fetch_one(&mut **tx)
    .await?;

    Ok(row.0 > 0)
}

async fn is_community_admin_tx(
    tx: &mut Transaction<'_, Postgres>,
    user_id: Uuid,
    community_id: Uuid,
) -> AppResult<bool> {
    let row = sqlx::query_as::<_, (i64,)>(
        "SELECT COUNT(*)
         FROM community_members
         WHERE community_id = $1 AND user_id = $2 AND role = 'admin'",
    )
    .bind(community_id)
    .bind(user_id)
    .fetch_one(&mut **tx)
    .await?;

    Ok(row.0 > 0)
}
