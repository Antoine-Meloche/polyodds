use crate::{
    auth::{AuthUser, MaybeAuthUser},
    error::{AppError, AppResult},
    routes::models::{
        communities::{
            Community,
            CommunityDetailResponse,
            CommunityListQuery,
            CommunityListResponse,
            CommunityMarketsQuery,
            CommunityMember,
            CommunityMembersResponse,
            CreateCommunityRequest,
            InviteMemberRequest,
            RoleResponse,
            UpdateCommunityRequest,
        },
        markets::{Market, MarketsResponse},
        users::PaginationQuery,
    },
    state::AppState,
};
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use uuid::Uuid;

use super::{
    ensure_community_member,
    page_limit,
    page_offset,
    require_community_admin,
};

pub async fn list_communities(
    State(state): State<AppState>,
    Query(query): Query<CommunityListQuery>,
) -> AppResult<Json<CommunityListResponse>> {
    let limit = page_limit(query.limit);
    let offset = page_offset(query.offset);

    let communities = sqlx::query_as::<_, Community>(
        "SELECT id, name, description, is_private, creator_id, created_at
         FROM communities
         WHERE is_private = FALSE
           AND ($1::text IS NULL OR name ILIKE '%' || $1 || '%')
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3",
    )
    .bind(query.search.clone())
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.pool)
    .await?;

    let (total,) = sqlx::query_as::<_, (i64,)>(
        "SELECT COUNT(*)
         FROM communities
         WHERE is_private = FALSE
           AND ($1::text IS NULL OR name ILIKE '%' || $1 || '%')",
    )
    .bind(query.search)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(CommunityListResponse { communities, total }))
}

pub async fn get_community(
    State(state): State<AppState>,
    maybe_auth: MaybeAuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<Json<CommunityDetailResponse>> {
    let community = sqlx::query_as::<_, Community>(
        "SELECT id, name, description, is_private, creator_id, created_at
         FROM communities WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    let mut is_member = false;
    let mut role = None;

    if let Some(auth) = maybe_auth.0 {
        let membership = sqlx::query_as::<_, (String,)>(
            "SELECT role
             FROM community_members
             WHERE community_id = $1 AND user_id = $2",
        )
        .bind(id)
        .bind(auth.user_id)
        .fetch_optional(&state.pool)
        .await?;

        if let Some((r,)) = membership {
            is_member = true;
            role = Some(r);
        }
    }

    if community.is_private && !is_member {
        return Err(AppError::Forbidden);
    }

    let (member_count,) = sqlx::query_as::<_, (i64,)>(
        "SELECT COUNT(*) FROM community_members WHERE community_id = $1",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await?;

    let (market_count,) = sqlx::query_as::<_, (i64,)>(
        "SELECT COUNT(*) FROM markets WHERE community_id = $1",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(CommunityDetailResponse {
        community,
        member_count,
        market_count,
        is_member,
        role,
    }))
}

pub async fn create_community(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(payload): Json<CreateCommunityRequest>,
) -> AppResult<Json<Community>> {
    let mut tx = state.pool.begin().await?;

    let community = sqlx::query_as::<_, Community>(
        "INSERT INTO communities (name, description, is_private, creator_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, description, is_private, creator_id, created_at",
    )
    .bind(payload.name.trim())
    .bind(payload.description.trim())
    .bind(payload.is_private)
    .bind(auth.user_id)
    .fetch_one(&mut *tx)
    .await?;

    sqlx::query(
        "INSERT INTO community_members (community_id, user_id, role)
         VALUES ($1, $2, 'admin')",
    )
    .bind(community.id)
    .bind(auth.user_id)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Json(community))
}

pub async fn update_community(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateCommunityRequest>,
) -> AppResult<Json<Community>> {
    require_community_admin(&state, auth.user_id, id).await?;

    let community = sqlx::query_as::<_, Community>(
        "UPDATE communities
         SET name = COALESCE($2, name),
             description = COALESCE($3, description),
             is_private = COALESCE($4, is_private),
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, name, description, is_private, creator_id, created_at",
    )
    .bind(id)
    .bind(payload.name)
    .bind(payload.description)
    .bind(payload.is_private)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(Json(community))
}

pub async fn delete_community(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<StatusCode> {
    require_community_admin(&state, auth.user_id, id).await?;

    let deleted = sqlx::query("DELETE FROM communities WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await?;

    if deleted.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    Ok(StatusCode::NO_CONTENT)
}

pub async fn join_community(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<Json<RoleResponse>> {
    let (is_private,) = sqlx::query_as::<_, (bool,)>("SELECT is_private FROM communities WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(AppError::NotFound)?;

    if is_private {
        return Err(AppError::Forbidden);
    }

    sqlx::query(
        "INSERT INTO community_members (community_id, user_id, role)
         VALUES ($1, $2, 'member')
         ON CONFLICT (community_id, user_id) DO NOTHING",
    )
    .bind(id)
    .bind(auth.user_id)
    .execute(&state.pool)
    .await?;

    Ok(Json(RoleResponse {
        role: "member".to_string(),
    }))
}

pub async fn leave_community(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<StatusCode> {
    let mut tx = state.pool.begin().await?;

    let (is_private,) = sqlx::query_as::<_, (bool,)>("SELECT is_private FROM communities WHERE id = $1")
        .bind(id)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or(AppError::NotFound)?;

    let role = sqlx::query_as::<_, (String,)>(
        "SELECT role FROM community_members WHERE community_id = $1 AND user_id = $2",
    )
    .bind(id)
    .bind(auth.user_id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(AppError::Forbidden)?;

    if role.0 == "admin" && is_private {
        let (admin_count,) = sqlx::query_as::<_, (i64,)>(
            "SELECT COUNT(*) FROM community_members WHERE community_id = $1 AND role = 'admin'",
        )
        .bind(id)
        .fetch_one(&mut *tx)
        .await?;

        if admin_count <= 1 {
            return Err(AppError::BadRequest("Cannot leave as last admin".to_string()));
        }
    }

    sqlx::query("DELETE FROM community_members WHERE community_id = $1 AND user_id = $2")
        .bind(id)
        .bind(auth.user_id)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn community_members(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
    Query(query): Query<PaginationQuery>,
) -> AppResult<Json<CommunityMembersResponse>> {
    ensure_community_member(&state, auth.user_id, id).await?;

    let limit = page_limit(query.limit);
    let offset = page_offset(query.offset);

    let members = sqlx::query_as::<_, CommunityMember>(
        "SELECT cm.community_id, cm.user_id, cm.role, cm.joined_at
         FROM community_members cm
         WHERE cm.community_id = $1
         ORDER BY cm.joined_at ASC
         LIMIT $2 OFFSET $3",
    )
    .bind(id)
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.pool)
    .await?;

    let (total,) = sqlx::query_as::<_, (i64,)>(
        "SELECT COUNT(*) FROM community_members WHERE community_id = $1",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(CommunityMembersResponse { members, total }))
}

pub async fn invite_member(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
    Json(payload): Json<InviteMemberRequest>,
) -> AppResult<Json<CommunityMember>> {
    require_community_admin(&state, auth.user_id, id).await?;

    let member = sqlx::query_as::<_, CommunityMember>(
        "INSERT INTO community_members (community_id, user_id, role)
         VALUES ($1, $2, 'member')
         ON CONFLICT (community_id, user_id)
         DO UPDATE SET role = community_members.role
         RETURNING community_id, user_id, role, joined_at",
    )
    .bind(id)
    .bind(payload.user_id)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(member))
}

pub async fn community_markets(
    State(state): State<AppState>,
    maybe_auth: MaybeAuthUser,
    Path(id): Path<Uuid>,
    Query(query): Query<CommunityMarketsQuery>,
) -> AppResult<Json<MarketsResponse>> {
    let community = sqlx::query_as::<_, (bool,)>("SELECT is_private FROM communities WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or(AppError::NotFound)?;

    if community.0 {
        let auth = maybe_auth.0.ok_or(AppError::Unauthorized)?;
        ensure_community_member(&state, auth.user_id, id).await?;
    }

    let limit = page_limit(query.limit);
    let offset = page_offset(query.offset);

    let markets = sqlx::query_as::<_, Market>(
        "SELECT id, title, description, category_id, community_id, creator_id, outcomes, status,
                winning_outcome_index, close_at, created_at
         FROM markets
         WHERE community_id = $1
           AND ($2::text IS NULL OR status = $2)
         ORDER BY created_at DESC
         LIMIT $3 OFFSET $4",
    )
    .bind(id)
    .bind(query.status.clone())
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.pool)
    .await?;

    let (total,) = sqlx::query_as::<_, (i64,)>(
        "SELECT COUNT(*)
         FROM markets
         WHERE community_id = $1
           AND ($2::text IS NULL OR status = $2)",
    )
    .bind(id)
    .bind(query.status)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(MarketsResponse { markets, total }))
}
