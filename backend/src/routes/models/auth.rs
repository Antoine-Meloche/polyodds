use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use super::users::User;

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: User,
}

#[derive(Debug, Serialize)]
pub struct DailyClaimResponse {
    pub points_earned: i64,
    pub new_balance: i64,
    pub next_claim_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}
