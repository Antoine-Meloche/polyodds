use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use super::markets::Bet;

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct User {
    pub id: Uuid,
    pub username: String,
    pub points: i64,
    pub created_at: DateTime<Utc>,
    pub last_claim_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct UserStats {
    pub markets_created: i64,
    pub bets_placed: i64,
    pub bets_won: i64,
}

#[derive(Debug, Serialize)]
pub struct UserWithStats {
    #[serde(flatten)]
    pub user: User,
    pub stats: UserStats,
}

#[derive(Debug, Serialize)]
pub struct BetsResponse {
    pub bets: Vec<Bet>,
    pub total: i64,
}

#[derive(Debug, Serialize)]
pub struct LeaderboardResponse {
    pub users: Vec<LeaderboardEntry>,
    pub total: i64,
}

#[derive(Debug, Serialize, Clone, FromRow)]
pub struct LeaderboardEntry {
    pub rank: i64,
    pub id: Uuid,
    pub username: String,
    pub points: i64,
}

#[derive(Debug, Deserialize)]
pub struct PaginationQuery {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct UserBetsQuery {
    pub status: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}
