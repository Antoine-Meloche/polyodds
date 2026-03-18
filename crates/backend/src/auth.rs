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
