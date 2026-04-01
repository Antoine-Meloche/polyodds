use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use ts_rs::TS;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone, FromRow, TS)]
#[ts(export, export_to = "markets/")]
pub struct Market {
    pub id: Uuid,
    pub title: String,
    pub description: String,
    pub category_id: Uuid,
    pub category_ids: Vec<Uuid>,
    pub creator_id: Uuid,
    pub outcomes: Vec<String>,
    #[ts(type = "\"open\" | \"resolved\"")]
    pub status: String,
    pub winning_outcome_index: Option<i32>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "markets/")]
pub struct MarketPool {
    pub outcome: String,
    pub total_points: i64,
    pub probability: f64,
}

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "markets/")]
pub struct UserPosition {
    pub outcome_index: i32,
    pub shares: i64,
}

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "markets/")]
pub struct MarketWithPools {
    #[serde(flatten)]
    #[ts(flatten)]
    pub market: Market,
    pub pools: Vec<MarketPool>,
    pub total_volume: i64,
    pub user_position: Option<UserPosition>,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow, TS)]
#[ts(export, export_to = "markets/")]
pub struct Bet {
    pub id: Uuid,
    pub market_id: Uuid,
    pub user_id: Uuid,
    pub outcome_index: i32,
    pub amount: i64,
    pub side: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow, TS)]
#[ts(export, export_to = "markets/")]
pub struct ProbabilitySnapshot {
    pub recorded_at: DateTime<Utc>,
    pub probabilities: Vec<f64>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "markets/")]
pub struct BetResponse {
    pub bet: Bet,
    pub new_balance: i64,
    pub probabilities_after: Vec<f64>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "markets/")]
pub struct MarketsResponse {
    pub markets: Vec<Market>,
    pub total: i64,
}

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "markets/")]
pub struct MarketHistoryResponse {
    pub history: Vec<ProbabilitySnapshot>,
}

#[derive(Debug, Deserialize)]
pub struct MarketListQuery {
    pub category_id: Option<Uuid>,
    pub category_ids: Option<String>,
    pub status: Option<String>,
    pub search: Option<String>,
    pub sort: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "markets/")]
pub struct CreateMarketRequest {
    pub title: String,
    pub description: String,
    pub category_ids: Vec<Uuid>,
    pub outcomes: Vec<String>,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "markets/")]
pub struct UpdateMarketRequest {
    pub title: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "markets/")]
pub struct ResolveMarketRequest {
    pub winning_outcome_index: i32,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "markets/")]
pub struct PlaceBetRequest {
    pub outcome_index: i32,
    pub amount: i64,
    pub side: Option<String>,
}

#[derive(Debug, Serialize, Clone, TS)]
#[ts(export, export_to = "markets/")]
pub struct MarketRealtimeEvent {
    pub market_id: Uuid,
    pub kind: String,
    #[ts(type = "\"open\" | \"resolved\"")]
    pub status: String,
    pub pools: Vec<i64>,
    pub probabilities: Vec<f64>,
    pub total_volume: i64,
}
