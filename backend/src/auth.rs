use crate::{error::AppError, state::AppState};
use async_trait::async_trait;
use axum::{
    extract::{FromRef, FromRequestParts},
    http::{header, request::Parts},
};
use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: Uuid,
    pub exp: i64,
    pub iat: i64,
}

#[derive(Clone, Debug)]
pub struct AuthUser {
    pub user_id: Uuid,
}

#[derive(Clone, Debug)]
pub struct MaybeAuthUser(pub Option<AuthUser>);

#[async_trait]
impl<S> FromRequestParts<S> for AuthUser
where
    AppState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let app_state = AppState::from_ref(state);
        let token = extract_bearer(parts)?;
        let claims = decode_token(&token, &app_state.jwt_secret)?;
        Ok(AuthUser {
            user_id: claims.sub,
        })
    }
}

#[async_trait]
impl<S> FromRequestParts<S> for MaybeAuthUser
where
    AppState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let app_state = AppState::from_ref(state);
        if let Ok(token) = extract_bearer(parts) {
            let claims = decode_token(&token, &app_state.jwt_secret)?;
            return Ok(Self(Some(AuthUser {
                user_id: claims.sub,
            })));
        }

        Ok(Self(None))
    }
}

fn extract_bearer(parts: &Parts) -> Result<String, AppError> {
    let header_value = parts
        .headers
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .ok_or(AppError::Unauthorized)?;

    let token = header_value
        .strip_prefix("Bearer ")
        .ok_or(AppError::Unauthorized)?;

    Ok(token.to_string())
}

pub fn hash_password(plain: &str) -> Result<String, AppError> {
    hash(plain, DEFAULT_COST).map_err(|_| AppError::Internal)
}

pub fn verify_password(plain: &str, hash_value: &str) -> Result<bool, AppError> {
    verify(plain, hash_value).map_err(|_| AppError::Internal)
}

pub fn encode_token(user_id: Uuid, secret: &str) -> Result<String, AppError> {
    let now = Utc::now();
    let claims = Claims {
        sub: user_id,
        iat: now.timestamp(),
        exp: (now + Duration::days(7)).timestamp(),
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|_| AppError::Internal)
}

pub fn decode_token(token: &str, secret: &str) -> Result<Claims, AppError> {
    let mut validation = Validation::new(Algorithm::HS256);
    validation.validate_exp = true;
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    )
    .map_err(|_| AppError::Unauthorized)?;

    Ok(token_data.claims)
}

pub fn validate_username(username: &str) -> bool {
    let name = username.trim();
    !name.is_empty() && name.len() >= 3 && name.len() <= 32
}

pub fn validate_password(password: &str) -> bool {
    password.len() >= 8
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::AppState;
    use axum::{
        body::Body,
        extract::FromRequestParts,
        http::{self, Request},
    };
    use sqlx::postgres::PgPoolOptions;

    fn test_state(secret: &str) -> AppState {
        let (market_events, _) = tokio::sync::broadcast::channel(32);
        AppState {
            pool: PgPoolOptions::new()
                .connect_lazy("postgres://local:local@localhost:5432/local")
                .expect("lazy pool should be created"),
            jwt_secret: secret.to_string(),
            market_events,
        }
    }

    #[test]
    fn username_validation_enforces_constraints() {
        assert!(!validate_username(""));
        assert!(!validate_username("ab"));
        assert!(validate_username("abc"));
        assert!(validate_username("  spaced_name  "));
        assert!(!validate_username(&"x".repeat(33)));
    }

    #[test]
    fn password_validation_enforces_min_length() {
        assert!(!validate_password("1234567"));
        assert!(validate_password("12345678"));
    }

    #[test]
    fn password_hash_and_verify_work() {
        let hashed = hash_password("secure-password").expect("hashing should succeed");
        assert!(verify_password("secure-password", &hashed).expect("verify should succeed"));
        assert!(!verify_password("wrong-password", &hashed).expect("verify should succeed"));
    }

    #[test]
    fn encode_and_decode_round_trip() {
        let user_id = Uuid::new_v4();
        let secret = "abcdefghijklmnopqrstuvwxyz123456";

        let token = encode_token(user_id, secret).expect("token should encode");
        let claims = decode_token(&token, secret).expect("token should decode");

        assert_eq!(claims.sub, user_id);
        assert!(claims.exp > claims.iat);
    }

    #[test]
    fn decode_token_rejects_wrong_secret() {
        let user_id = Uuid::new_v4();
        let token = encode_token(user_id, "abcdefghijklmnopqrstuvwxyz123456")
            .expect("token should encode");

        let result = decode_token(&token, "different_secret_abcdefghijklmnopqrstuvwxyz");
        assert!(matches!(result, Err(AppError::Unauthorized)));
    }

    #[tokio::test]
    async fn auth_user_extractor_accepts_valid_bearer_token() {
        let secret = "abcdefghijklmnopqrstuvwxyz123456";
        let state = test_state(secret);
        let user_id = Uuid::new_v4();
        let token = encode_token(user_id, secret).expect("token should encode");

        let req = Request::builder()
            .uri("/api/auth/me")
            .header(http::header::AUTHORIZATION, format!("Bearer {}", token))
            .body(Body::empty())
            .expect("request should build");
        let (mut parts, _) = req.into_parts();

        let auth = AuthUser::from_request_parts(&mut parts, &state)
            .await
            .expect("extractor should succeed");
        assert_eq!(auth.user_id, user_id);
    }

    #[tokio::test]
    async fn maybe_auth_user_returns_none_without_header() {
        let state = test_state("abcdefghijklmnopqrstuvwxyz123456");
        let req = Request::builder()
            .uri("/api/markets")
            .body(Body::empty())
            .expect("request should build");
        let (mut parts, _) = req.into_parts();

        let maybe = MaybeAuthUser::from_request_parts(&mut parts, &state)
            .await
            .expect("extractor should not fail without header");
        assert!(maybe.0.is_none());
    }

    #[tokio::test]
    async fn maybe_auth_user_rejects_invalid_token_when_present() {
        let state = test_state("abcdefghijklmnopqrstuvwxyz123456");
        let req = Request::builder()
            .uri("/api/markets")
            .header(http::header::AUTHORIZATION, "Bearer not-a-token")
            .body(Body::empty())
            .expect("request should build");
        let (mut parts, _) = req.into_parts();

        let result = MaybeAuthUser::from_request_parts(&mut parts, &state).await;
        assert!(matches!(result, Err(AppError::Unauthorized)));
    }
}
