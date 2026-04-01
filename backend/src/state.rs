use crate::routes::models::markets::MarketRealtimeEvent;
use sqlx::PgPool;
use tokio::sync::broadcast;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub jwt_secret: String,
    pub market_events: broadcast::Sender<MarketRealtimeEvent>,
}
