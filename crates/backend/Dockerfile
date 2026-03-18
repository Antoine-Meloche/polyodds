FROM rust:1-bookworm AS dev

WORKDIR /workspace

RUN apt-get update \
    && apt-get install -y --no-install-recommends pkg-config libssl-dev ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN cargo install cargo-watch \
    && cargo install sqlx-cli --no-default-features --features postgres,rustls

FROM rust:1-bookworm AS builder

WORKDIR /workspace

COPY Cargo.toml Cargo.lock ./
COPY crates/backend/Cargo.toml crates/backend/Cargo.toml
RUN mkdir -p crates/backend/src
RUN printf "fn main() {}\n" > crates/backend/src/main.rs
RUN printf "\n" > crates/backend/src/lib.rs
RUN cargo fetch

COPY . .
RUN cargo build -p backend --release

FROM debian:bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /workspace/target/release/backend /usr/local/bin/backend
COPY --from=dev /usr/local/cargo/bin/sqlx /usr/local/bin/sqlx
COPY /migrations /app/migrations

EXPOSE 3000

CMD ["backend"]
