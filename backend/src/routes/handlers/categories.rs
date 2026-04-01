use crate::{
    error::{AppError, AppResult, PG_UNIQUE_VIOLATION},
    routes::models::categories::{CategoriesResponse, Category, CategoryCreateRequest},
    state::AppState,
};
use axum::{extract::State, Json};

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
