pub mod auth;
pub mod categories;
pub mod markets;
pub mod users;

fn page_limit(limit: Option<i64>) -> i64 {
    limit.unwrap_or(20).clamp(1, 100)
}

fn page_offset(offset: Option<i64>) -> i64 {
    offset.unwrap_or(0).max(0)
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