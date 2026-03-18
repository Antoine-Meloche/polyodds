use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use ts_rs::TS;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone, FromRow, TS)]
#[ts(export, export_to = "communities/")]
pub struct Community {
    pub id: Uuid,
    pub name: String,
    pub description: String,
    pub is_private: bool,
    pub creator_id: Uuid,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow, TS)]
#[ts(export, export_to = "communities/")]
pub struct CommunityMember {
    pub community_id: Uuid,
    pub user_id: Uuid,
    #[ts(type = "\"admin\" | \"member\"")]
    pub role: String,
    pub joined_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "communities/")]
pub struct CommunityListResponse {
    pub communities: Vec<Community>,
    pub total: i64,
}

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "communities/")]
pub struct CommunityMembersResponse {
    pub members: Vec<CommunityMember>,
    pub total: i64,
}

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "communities/")]
pub struct RoleResponse {
    #[ts(type = "\"admin\" | \"member\"")]
    pub role: String,
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

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "communities/")]
pub struct CreateCommunityRequest {
    pub name: String,
    pub description: String,
    pub is_private: bool,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "communities/")]
pub struct UpdateCommunityRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub is_private: Option<bool>,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "communities/")]
pub struct InviteMemberRequest {
    pub user_id: Uuid,
}

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "communities/")]
pub struct CommunityDetailResponse {
    #[serde(flatten)]
    #[ts(flatten)]
    pub community: Community,
    pub member_count: i64,
    pub market_count: i64,
    pub is_member: bool,
    #[ts(type = "\"admin\" | \"member\" | null")]
    pub role: Option<String>,
}
