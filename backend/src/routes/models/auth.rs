use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::users::User;

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "auth/")]
pub struct AuthResponse {
    pub token: String,
    pub user: User,
}

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "auth/")]
pub struct DailyClaimResponse {
    pub points_earned: i64,
    pub new_balance: i64,
    pub next_claim_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "auth/")]
pub struct RegisterRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "auth/")]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}
