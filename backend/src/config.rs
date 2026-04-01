#[derive(Clone, Debug)]
pub struct AppConfig {
    pub database_url: String,
    pub jwt_secret: String,
    pub bind_addr: String,
    pub frontend_origin: String,
    pub database_max_connections: u32,
}

impl AppConfig {
    pub fn from_env() -> anyhow::Result<Self> {
        let database_url = std::env::var("DATABASE_URL")
            .map_err(|_| anyhow::anyhow!("DATABASE_URL must be set"))?;
        let jwt_secret = std::env::var("JWT_SECRET").map_err(|_| anyhow::anyhow!("JWT_SECRET must be set"))?;
        if jwt_secret.len() < 32 {
            return Err(anyhow::anyhow!("JWT_SECRET must be at least 32 bytes"));
        }

        Ok(Self {
            database_url,
            jwt_secret,
            bind_addr: std::env::var("BIND_ADDR").unwrap_or_else(|_| "127.0.0.1:3000".to_string()),
            frontend_origin: std::env::var("FRONTEND_ORIGIN")
                .unwrap_or_else(|_| "http://localhost:5173".to_string()),
            database_max_connections: std::env::var("DATABASE_MAX_CONNECTIONS")
                .ok()
                .and_then(|v| v.parse::<u32>().ok())
                .unwrap_or(10),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    const DEFAULT_BIND_ADDR: &str = "127.0.0.1:3000";
    const DEFAULT_FRONTEND_ORIGIN: &str = "http://localhost:5173";
    static ENV_LOCK: Mutex<()> = Mutex::new(());

    fn set_env(key: &str, value: &str) {
        unsafe { std::env::set_var(key, value) }
    }

    fn remove_env(key: &str) {
        unsafe { std::env::remove_var(key) }
    }

    fn clear_test_env() {
        remove_env("DATABASE_URL");
        remove_env("JWT_SECRET");
        remove_env("BIND_ADDR");
        remove_env("FRONTEND_ORIGIN");
        remove_env("DATABASE_MAX_CONNECTIONS");
    }

    #[test]
    fn from_env_requires_database_url() {
        let _guard = ENV_LOCK.lock().expect("env lock should not be poisoned");
        clear_test_env();
        set_env("JWT_SECRET", "abcdefghijklmnopqrstuvwxyz123456");

        let err = AppConfig::from_env().expect_err("DATABASE_URL should be required");
        assert!(err.to_string().contains("DATABASE_URL must be set"));
    }

    #[test]
    fn from_env_requires_jwt_secret() {
        let _guard = ENV_LOCK.lock().expect("env lock should not be poisoned");
        clear_test_env();
        set_env("DATABASE_URL", "postgres://user:pass@localhost:5432/polyodds");

        let err = AppConfig::from_env().expect_err("JWT_SECRET should be required");
        assert!(err.to_string().contains("JWT_SECRET must be set"));
    }

    #[test]
    fn from_env_rejects_short_jwt_secret() {
        let _guard = ENV_LOCK.lock().expect("env lock should not be poisoned");
        clear_test_env();
        set_env("DATABASE_URL", "postgres://user:pass@localhost:5432/polyodds");
        set_env("JWT_SECRET", "too-short");

        let err = AppConfig::from_env().expect_err("short JWT_SECRET should be rejected");
        assert!(err
            .to_string()
            .contains("JWT_SECRET must be at least 32 bytes"));
    }

    #[test]
    fn from_env_uses_defaults_for_optional_values() {
        let _guard = ENV_LOCK.lock().expect("env lock should not be poisoned");
        clear_test_env();
        set_env("DATABASE_URL", "postgres://user:pass@localhost:5432/polyodds");
        set_env("JWT_SECRET", "abcdefghijklmnopqrstuvwxyz123456");

        let cfg = AppConfig::from_env().expect("config should parse");
        assert_eq!(cfg.bind_addr, DEFAULT_BIND_ADDR);
        assert_eq!(cfg.frontend_origin, DEFAULT_FRONTEND_ORIGIN);
        assert_eq!(cfg.database_max_connections, 10);
    }

    #[test]
    fn from_env_reads_optional_overrides() {
        let _guard = ENV_LOCK.lock().expect("env lock should not be poisoned");
        clear_test_env();
        set_env("DATABASE_URL", "postgres://user:pass@localhost:5432/polyodds");
        set_env("JWT_SECRET", "abcdefghijklmnopqrstuvwxyz123456");
        set_env("BIND_ADDR", "0.0.0.0:9000");
        set_env("FRONTEND_ORIGIN", "https://example.com");
        set_env("DATABASE_MAX_CONNECTIONS", "42");

        let cfg = AppConfig::from_env().expect("config should parse");
        assert_eq!(cfg.bind_addr, "0.0.0.0:9000");
        assert_eq!(cfg.frontend_origin, "https://example.com");
        assert_eq!(cfg.database_max_connections, 42);
    }
}
