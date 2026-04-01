use crate::{
    error::{AppError, AppResult, PG_UNIQUE_VIOLATION},
    routes::models::categories::{CategoriesResponse, Category, CategoryCreateRequest},
    state::AppState,
};
use axum::{extract::{Path, State}, Json};
use uuid::Uuid;

pub async fn list_categories(State(state): State<AppState>) -> AppResult<Json<CategoriesResponse>> {
    let categories = sqlx::query_as::<_, Category>(
        "SELECT id, name, slug FROM categories ORDER BY name ASC",
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(CategoriesResponse { categories }))
}

pub async fn create_category(
    State(state): State<AppState>,
    Json(payload): Json<CategoryCreateRequest>,
) -> AppResult<Json<Category>> {
    let category = sqlx::query_as::<_, Category>(
        "INSERT INTO categories (name, slug)
         VALUES ($1, $2)
         RETURNING id, name, slug",
    )
    .bind(payload.name.trim())
    .bind(payload.slug.trim().to_lowercase())
    .fetch_one(&state.pool)
    .await
    .map_err(|e| match &e {
        sqlx::Error::Database(db_err) if db_err.code().as_deref() == Some(PG_UNIQUE_VIOLATION) => {
            AppError::Conflict("Category slug already exists".to_string())
        }
        _ => AppError::Db(e),
    })?;

    Ok(Json(category))
}

pub async fn delete_category(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<serde_json::Value>> {
    let (exists,): (bool,) = sqlx::query_as("SELECT EXISTS(SELECT 1 FROM categories WHERE id = $1)")
        .bind(id)
        .fetch_one(&state.pool)
        .await?;

    if !exists {
        return Err(AppError::NotFound);
    }

    let (is_used,): (bool,) = sqlx::query_as(
        "SELECT EXISTS(
           SELECT 1
           FROM markets
           WHERE category_id = $1 OR $1 = ANY(category_ids)
         )",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await?;

    if is_used {
        return Err(AppError::BadRequest(
            "Cannot delete category because it is used by one or more markets".to_string(),
        ));
    }

    sqlx::query("DELETE FROM categories WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await?;

    Ok(Json(serde_json::json!({ "deleted": true })))
}
