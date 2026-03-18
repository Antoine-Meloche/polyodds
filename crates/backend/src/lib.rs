pub mod auth;
pub mod config;
pub mod error;
pub mod handlers;
pub mod models;
pub mod state;

use axum::{routing::{delete, get, post}, Router};
use config::AppConfig;
use sqlx::postgres::PgPoolOptions;
use state::AppState;
use std::time::Duration;
use tower_http::{cors::CorsLayer, trace::TraceLayer};

pub async fn build_app(config: AppConfig) -> anyhow::Result<Router> {
    let pool = PgPoolOptions::new()
        .max_connections(config.database_max_connections)
        .acquire_timeout(Duration::from_secs(10))
        .connect(&config.database_url)
        .await?;

    // Keep local/dev startup resilient by ensuring schema migrations are applied.
    sqlx::migrate!("../../migrations").run(&pool).await?;

    let state = AppState {
        pool,
        jwt_secret: config.jwt_secret,
    };

    let app = Router::new()
        .route("/api/auth/register", post(handlers::register))
        .route("/api/auth/login", post(handlers::login))
        .route("/api/auth/me", get(handlers::me))
        .route("/api/auth/daily-claim", post(handlers::daily_claim))
        .route("/api/categories", get(handlers::list_categories).post(handlers::create_category))
        .route("/api/users/{id}", get(handlers::get_user))
        .route("/api/users/{id}/bets", get(handlers::get_user_bets))
        .route("/api/leaderboard", get(handlers::leaderboard))
        .route("/api/markets", get(handlers::list_markets).post(handlers::create_market))
        .route("/api/markets/{id}", get(handlers::get_market).patch(handlers::update_market))
        .route("/api/markets/{id}/resolve", post(handlers::resolve_market))
        .route("/api/markets/{id}/history", get(handlers::market_history))
        .route("/api/markets/{id}/bets", get(handlers::market_bets_for_me))
        .route("/api/markets/{id}/bet", post(handlers::place_bet))
        .route("/api/communities", get(handlers::list_communities).post(handlers::create_community))
        .route(
            "/api/communities/{id}",
            get(handlers::get_community)
                .patch(handlers::update_community)
                .delete(handlers::delete_community),
        )
        .route("/api/communities/{id}/join", post(handlers::join_community))
        .route("/api/communities/{id}/leave", delete(handlers::leave_community))
        .route("/api/communities/{id}/members", get(handlers::community_members))
        .route("/api/communities/{id}/invite", post(handlers::invite_member))
        .route("/api/communities/{id}/markets", get(handlers::community_markets))
        .layer(
            CorsLayer::new()
                .allow_origin([config.frontend_origin.parse()?])
                .allow_methods([http::Method::GET, http::Method::POST, http::Method::PATCH, http::Method::DELETE])
                .allow_headers([http::header::AUTHORIZATION, http::header::CONTENT_TYPE]),
        )
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    Ok(app)
}
