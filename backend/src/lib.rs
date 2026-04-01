pub mod auth;
pub mod config;
pub mod error;
pub mod routes;
pub mod state;

use axum::{routing::{delete, get, post}, Router};
use config::AppConfig;
use routes::handlers::{auth as auth_handlers, categories, markets, users};
use sqlx::postgres::PgPoolOptions;
use state::AppState;
use std::time::Duration;
use tokio::sync::broadcast;
use tower_http::{cors::CorsLayer, trace::TraceLayer};

pub async fn build_app(config: AppConfig) -> anyhow::Result<Router> {
    let pool = PgPoolOptions::new()
        .max_connections(config.database_max_connections)
        .acquire_timeout(Duration::from_secs(10))
        .connect(&config.database_url)
        .await?;

    // Keep local/dev startup resilient by ensuring schema migrations are applied.
    sqlx::migrate!("../migrations").run(&pool).await?;

    let (market_events, _) = broadcast::channel(512);

    let state = AppState {
        pool,
        jwt_secret: config.jwt_secret,
        market_events,
    };

    let app = Router::new()
        .route("/api/auth/register", post(auth_handlers::register))
        .route("/api/auth/login", post(auth_handlers::login))
        .route("/api/auth/me", get(auth_handlers::me))
        .route("/api/auth/daily-claim", post(auth_handlers::daily_claim))
        .route("/api/categories", get(categories::list_categories).post(categories::create_category))
        .route("/api/categories/:id", delete(categories::delete_category))
        .route("/api/users/:id", get(users::get_user))
        .route("/api/users/:id/bets", get(users::get_user_bets))
        .route("/api/users/me", delete(users::delete_me))
        .route("/api/leaderboard", get(users::leaderboard))
        .route("/api/markets", get(markets::list_markets).post(markets::create_market))
        .route("/api/markets/:id", get(markets::get_market).patch(markets::update_market).delete(markets::delete_market))
        .route("/api/markets/:id/resolve", post(markets::resolve_market))
        .route("/api/markets/:id/history", get(markets::market_history))
        .route("/api/markets/ws", get(markets::markets_global_ws))
        .route("/api/markets/:id/ws", get(markets::market_ws))
        .route("/api/markets/:id/bets", get(markets::market_bets_for_me))
        .route("/api/markets/:id/bet", post(markets::place_bet))
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
