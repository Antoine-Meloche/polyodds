# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PolyOdds is a prediction markets platform where users create markets, bet on outcomes, and earn points. It uses dynamic odds via liquidity pools (CPMM-style).

## Commands

### Backend (Rust/Axum)
```bash
cargo build                    # Build
cargo test                     # Run tests + export TypeScript bindings
cargo watch -x 'run -p backend' # Dev with auto-reload
sqlx migrate run               # Apply database migrations
```

### Frontend (React/TypeScript)
```bash
cd frontend && npm run dev     # Start Vite dev server (port 5173)
cd frontend && npm run build   # Build for production
cd frontend && npm run lint    # ESLint
cd frontend && npm run generate:types  # Regenerate TypeScript types from Rust (runs cargo test export_bindings)
cd frontend && npm run test:e2e       # Run Playwright E2E tests
```

### Database & Docker
```bash
docker-compose up postgres                # Start PostgreSQL only
docker-compose --profile debug up        # Start with cargo watch backend
docker-compose --profile app up          # Start full production-like stack
```

### Development Environment Variables
Set by `flake.nix` shell hook (or provide manually):
```
DATABASE_URL=postgres://polyodds:polyodds@localhost:5432/polyodds
JWT_SECRET=dev-only-change-me-to-at-least-32-bytes
FRONTEND_ORIGIN=http://localhost:5173
BIND_ADDR=127.0.0.1:3000
```

## Architecture

### Backend (`backend/src/`)
- **`lib.rs`** — App builder, router setup, CORS middleware
- **`state.rs`** — `AppState` holds DB pool, JWT config, and `broadcast::Sender<MarketRealtimeEvent>` for WebSocket events
- **`auth.rs`** — JWT creation/validation, bcrypt password hashing, Axum extractors (`AuthUser`, `OptionalAuthUser`)
- **`config.rs`** — `AppConfig` loaded from environment variables (validated at startup)
- **`error.rs`** — `AppError` enum mapping to HTTP status codes
- **`routes/handlers/`** — One file per domain: `auth.rs`, `markets.rs`, `users.rs`, `categories.rs`
- **`routes/models/`** — Request/response DTOs and DB row types, with `#[derive(TS)]` for TypeScript codegen

### Frontend (`frontend/src/`)
- **`App.tsx`** — React Router setup + QueryClient/Zustand providers
- **`stores/authStore.ts`** — Zustand store for JWT token and current user (persisted to localStorage)
- **`api/client.ts`** — Axios instance with auth header interceptor; `api/queryClient.ts` configures React Query
- **`api/*.ts`** — One file per domain, exporting async functions and React Query hooks
- **`types/generated/`** — Auto-generated from Rust via `ts-rs`. **Never edit manually** — run `npm run generate:types`
- **`pages/`** — Page-level components (one per route)
- **`components/`** — Organized by domain: `layout/`, `markets/`, `communities/`, `shared/`

### Real-time
Markets support live updates via WebSocket at `GET /api/markets/:id/ws`. The backend broadcasts `MarketRealtimeEvent` through a `tokio::sync::broadcast` channel stored in `AppState`.

### Type Safety Bridge
Rust structs tagged with `#[derive(TS)]` (from `ts-rs` crate) auto-generate TypeScript types into `frontend/src/types/generated/`. Run `cargo test export_bindings` (or `npm run generate:types`) after changing backend models.

### Database Migrations
SQL migrations live in `migrations/`. Apply with `sqlx migrate run`. The market pricing system uses per-outcome liquidity pools (see `003_market_dynamic_trading.sql` and `004_seed_initial_pool_liquidity.sql`).

### API Routes
All routes are under `/api/`:
- `POST /register`, `POST /login`, `GET /me`, `POST /daily-claim`
- `GET /markets`, `POST /markets`, `GET /markets/:id`, `PATCH /markets/:id`
- `POST /markets/:id/resolve`, `POST /markets/:id/bet`, `GET /markets/:id/bets`
- `GET /markets/:id/history`, `GET /markets/:id/ws` (WebSocket)
- `GET /users/:id`, `GET /users/:id/bets`, `DELETE /users/me`, `GET /leaderboard`
- `GET /categories`, `POST /categories`
