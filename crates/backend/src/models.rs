use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

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

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct Category {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct Community {
    pub id: Uuid,
    pub name: String,
    pub description: String,
    pub is_private: bool,
    pub creator_id: Uuid,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct CommunityMember {
    pub community_id: Uuid,
    pub user_id: Uuid,
    pub role: String,
    pub joined_at: DateTime<Utc>,
}

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
pub struct CategoriesResponse {
    pub categories: Vec<Category>,
}

#[derive(Debug, Serialize)]
pub struct CommunityListResponse {
    pub communities: Vec<Community>,
    pub total: i64,
}

#[derive(Debug, Serialize)]
pub struct BetsResponse {
    pub bets: Vec<Bet>,
    pub total: i64,
}

#[derive(Debug, Serialize)]
pub struct CommunityMembersResponse {
    pub members: Vec<CommunityMember>,
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

#[derive(Debug, Serialize)]
pub struct MarketHistoryResponse {
    pub history: Vec<ProbabilitySnapshot>,
}

#[derive(Debug, Serialize)]
pub struct RoleResponse {
    pub role: String,
}

#[derive(Debug, Deserialize)]
pub struct PaginationQuery {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
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

#[derive(Debug, Deserialize)]
pub struct CategoryCreateRequest {
    pub name: String,
    pub slug: String,
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

#[derive(Debug, Deserialize)]
pub struct UserBetsQuery {
    pub status: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct CommunityListQuery {
    pub search: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct CommunityMarketsQuery {
    pub status: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCommunityRequest {
    pub name: String,
    pub description: String,
    pub is_private: bool,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCommunityRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub is_private: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct InviteMemberRequest {
    pub user_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct CommunityDetailResponse {
    #[serde(flatten)]
    pub community: Community,
    pub member_count: i64,
    pub market_count: i64,
    pub is_member: bool,
    pub role: Option<String>,
}
