use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct Market {
    pub id: Uuid,
    pub title: String,
    pub description: String,
    pub category_id: Uuid,
    pub community_id: Option<Uuid>,
    pub creator_id: Uuid,
    pub outcomes: Vec<String>,
    pub status: String,
    pub winning_outcome_index: Option<i32>,
    pub close_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct MarketPool {
    pub outcome: String,
    pub total_points: i64,
    pub probability: f64,
}

#[derive(Debug, Serialize)]
pub struct UserPosition {
    pub outcome_index: i32,
    pub amount: i64,
}

#[derive(Debug, Serialize)]
pub struct MarketWithPools {
    #[serde(flatten)]
    pub market: Market,
    pub pools: Vec<MarketPool>,
    pub total_volume: i64,
    pub user_position: Option<UserPosition>,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct Bet {
    pub id: Uuid,
    pub market_id: Uuid,
    pub user_id: Uuid,
    pub outcome_index: i32,
    pub amount: i64,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct ProbabilitySnapshot {
    pub recorded_at: DateTime<Utc>,
    pub probabilities: Vec<f64>,
}

#[derive(Debug, Serialize)]
pub struct BetResponse {
    pub bet: Bet,
    pub new_balance: i64,
    pub probabilities_after: Vec<f64>,
}

#[derive(Debug, Serialize)]
pub struct MarketsResponse {
    pub markets: Vec<Market>,
    pub total: i64,
}

#[derive(Debug, Serialize)]
pub struct MarketHistoryResponse {
    pub history: Vec<ProbabilitySnapshot>,
}

#[derive(Debug, Deserialize)]
pub struct MarketListQuery {
    pub category_id: Option<Uuid>,
    pub community_id: Option<Uuid>,
    pub status: Option<String>,
    pub search: Option<String>,
    pub sort: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct CreateMarketRequest {
    pub title: String,
    pub description: String,
    pub category_id: Uuid,
    pub community_id: Option<Uuid>,
    pub outcomes: Vec<String>,
    pub close_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMarketRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub close_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct ResolveMarketRequest {
    pub winning_outcome_index: i32,
}

#[derive(Debug, Deserialize)]
pub struct PlaceBetRequest {
    pub outcome_index: i32,
    pub amount: i64,
}
