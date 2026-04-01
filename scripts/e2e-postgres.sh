#!/usr/bin/env bash

set -euo pipefail

action="${1:-up}"
project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
e2e_database="polyodds_e2e"
postgres_port="${POSTGRES_PORT:-55432}"

case "$action" in
  up)
    cd "$project_root"
    POSTGRES_PORT="$postgres_port" docker compose up -d postgres >/dev/null

    for _ in $(seq 1 60); do
      if POSTGRES_PORT="$postgres_port" docker compose exec -T postgres pg_isready -U polyodds -d polyodds >/dev/null 2>&1; then
        POSTGRES_PORT="$postgres_port" docker compose exec -T postgres psql -U polyodds -d postgres -c "DROP DATABASE IF EXISTS ${e2e_database} WITH (FORCE);" >/dev/null
        POSTGRES_PORT="$postgres_port" docker compose exec -T postgres psql -U polyodds -d postgres -c "CREATE DATABASE ${e2e_database} OWNER polyodds;" >/dev/null
        exec tail -f /dev/null
      fi
      sleep 1
    done

    echo 'Postgres did not become ready in time' >&2
    exit 1
    ;;
  down)
    cd "$project_root"
    POSTGRES_PORT="$postgres_port" docker compose stop postgres >/dev/null
    ;;
  *)
    echo "Usage: $0 [up|down]" >&2
    exit 1
    ;;
esac