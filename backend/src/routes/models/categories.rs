use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use ts_rs::TS;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone, FromRow, TS)]
#[ts(export, export_to = "categories/")]
pub struct Category {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
}

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "categories/")]
pub struct CategoriesResponse {
    pub categories: Vec<Category>,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "categories/")]
pub struct CategoryCreateRequest {
    pub name: String,
    pub slug: String,
}
