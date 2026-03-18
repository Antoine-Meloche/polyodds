use crate::{
    auth::{encode_token, hash_password, validate_password, validate_username, verify_password, AuthUser},
    error::{AppError, AppResult},
    routes::models::{
        auth::{AuthResponse, DailyClaimResponse, LoginRequest, RegisterRequest},
        users::User,
    },
    state::AppState,
};
use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use chrono::{Duration, Utc};
use serde::Serialize;
use sqlx::FromRow;
use uuid::Uuid;

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
