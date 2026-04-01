pub mod auth;
pub mod categories;
pub mod communities;
pub mod markets;
pub mod users;

use crate::{
    error::{AppError, AppResult},
    state::AppState,
};
use sqlx::{Postgres, Transaction};
use uuid::Uuid;

fn page_limit(limit: Option<i64>) -> i64 {
    limit.unwrap_or(20).clamp(1, 100)
}

fn page_offset(offset: Option<i64>) -> i64 {
    offset.unwrap_or(0).max(0)
}

async fn ensure_community_member(state: &AppState, user_id: Uuid, community_id: Uuid) -> AppResult<()> {
    let is_member = is_community_member(state, user_id, community_id).await?;
    if !is_member {
        return Err(AppError::Forbidden);
    }
    Ok(())
}

async fn require_community_admin(state: &AppState, user_id: Uuid, community_id: Uuid) -> AppResult<()> {
    let is_admin = is_community_admin(state, user_id, community_id).await?;
    if !is_admin {
        return Err(AppError::Forbidden);
    }
    Ok(())
}

async fn is_community_member(state: &AppState, user_id: Uuid, community_id: Uuid) -> AppResult<bool> {
    let row = sqlx::query_as::<_, (i64,)>(
        "SELECT COUNT(*) FROM community_members WHERE community_id = $1 AND user_id = $2",
    )
    .bind(community_id)
    .bind(user_id)
    .fetch_one(&state.pool)
    .await?;

    Ok(row.0 > 0)
}

async fn is_community_admin(state: &AppState, user_id: Uuid, community_id: Uuid) -> AppResult<bool> {
    let row = sqlx::query_as::<_, (i64,)>(
        "SELECT COUNT(*)
         FROM community_members
         WHERE community_id = $1 AND user_id = $2 AND role = 'admin'",
    )
    .bind(community_id)
    .bind(user_id)
    .fetch_one(&state.pool)
    .await?;

    Ok(row.0 > 0)
}

async fn is_community_member_tx(
    tx: &mut Transaction<'_, Postgres>,
    user_id: Uuid,
    community_id: Uuid,
) -> AppResult<bool> {
    let row = sqlx::query_as::<_, (i64,)>(
        "SELECT COUNT(*) FROM community_members WHERE community_id = $1 AND user_id = $2",
    )
    .bind(community_id)
    .bind(user_id)
    .fetch_one(&mut **tx)
    .await?;

    Ok(row.0 > 0)
}

async fn is_community_admin_tx(
    tx: &mut Transaction<'_, Postgres>,
    user_id: Uuid,
    community_id: Uuid,
) -> AppResult<bool> {
    let row = sqlx::query_as::<_, (i64,)>(
        "SELECT COUNT(*)
         FROM community_members
         WHERE community_id = $1 AND user_id = $2 AND role = 'admin'",
    )
    .bind(community_id)
    .bind(user_id)
    .fetch_one(&mut **tx)
    .await?;

    Ok(row.0 > 0)
}

#[cfg(test)]
mod tests {
    use super::{page_limit, page_offset};

    #[test]
    fn page_limit_uses_default_when_none() {
        assert_eq!(page_limit(None), 20);
    }

    #[test]
    fn page_limit_is_clamped_to_bounds() {
        assert_eq!(page_limit(Some(0)), 1);
        assert_eq!(page_limit(Some(1)), 1);
        assert_eq!(page_limit(Some(50)), 50);
        assert_eq!(page_limit(Some(101)), 100);
    }

    #[test]
    fn page_offset_uses_default_when_none_and_clamps_negative() {
        assert_eq!(page_offset(None), 0);
        assert_eq!(page_offset(Some(-20)), 0);
        assert_eq!(page_offset(Some(0)), 0);
        assert_eq!(page_offset(Some(10)), 10);
    }
}