use axum::{http::StatusCode, response::IntoResponse, Json};
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Unauthorized")]
    Unauthorized,
    #[error("Forbidden")]
    Forbidden,
    #[error("Not found")]
    NotFound,
    #[error("Bad request: {0}")]
    BadRequest(String),
    #[error("Conflict: {0}")]
    Conflict(String),
    #[error("Validation failed: {0}")]
    Validation(String),
    #[error("Database error: {0}")]
    Db(#[from] sqlx::Error),
    #[error("Internal server error")]
    Internal,
}

#[derive(Serialize)]
struct ErrorBody {
    error: String,
    code: String,
}

impl AppError {
    pub fn status_code(&self) -> StatusCode {
        match self {
            Self::Unauthorized => StatusCode::UNAUTHORIZED,
            Self::Forbidden => StatusCode::FORBIDDEN,
            Self::NotFound => StatusCode::NOT_FOUND,
            Self::BadRequest(_) | Self::Validation(_) => StatusCode::BAD_REQUEST,
            Self::Conflict(_) => StatusCode::CONFLICT,
            Self::Db(_) | Self::Internal => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    pub fn code(&self) -> &'static str {
        match self {
            Self::Unauthorized => "UNAUTHORIZED",
            Self::Forbidden => "FORBIDDEN",
            Self::NotFound => "NOT_FOUND",
            Self::BadRequest(_) => "BAD_REQUEST",
            Self::Conflict(_) => "CONFLICT",
            Self::Validation(_) => "VALIDATION_ERROR",
            Self::Db(_) | Self::Internal => "INTERNAL_ERROR",
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        let status = self.status_code();
        let body = Json(ErrorBody {
            error: self.to_string(),
            code: self.code().to_string(),
        });
        (status, body).into_response()
    }
}

pub type AppResult<T> = Result<T, AppError>;

pub const PG_UNIQUE_VIOLATION: &str = "23505";

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::to_bytes;

    #[test]
    fn status_and_code_are_mapped_consistently() {
        let cases = vec![
            (AppError::Unauthorized, StatusCode::UNAUTHORIZED, "UNAUTHORIZED"),
            (AppError::Forbidden, StatusCode::FORBIDDEN, "FORBIDDEN"),
            (AppError::NotFound, StatusCode::NOT_FOUND, "NOT_FOUND"),
            (
                AppError::BadRequest("oops".to_string()),
                StatusCode::BAD_REQUEST,
                "BAD_REQUEST",
            ),
            (
                AppError::Validation("bad".to_string()),
                StatusCode::BAD_REQUEST,
                "VALIDATION_ERROR",
            ),
            (
                AppError::Conflict("exists".to_string()),
                StatusCode::CONFLICT,
                "CONFLICT",
            ),
            (AppError::Internal, StatusCode::INTERNAL_SERVER_ERROR, "INTERNAL_ERROR"),
        ];

        for (err, expected_status, expected_code) in cases {
            assert_eq!(err.status_code(), expected_status);
            assert_eq!(err.code(), expected_code);
        }
    }

    #[tokio::test]
    async fn into_response_contains_error_and_code() {
        let response = AppError::Validation("Username invalid".to_string()).into_response();
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);

        let body_bytes = to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("response body should be readable");
        let body: serde_json::Value =
            serde_json::from_slice(&body_bytes).expect("response should be valid json");

        assert_eq!(body["code"], "VALIDATION_ERROR");
        assert_eq!(body["error"], "Validation failed: Username invalid");
    }
}
