#!/usr/bin/env bash
# Per-boot reconciliation: bring up Postgres + Redis, ensure DB, apply schema + seed.
# Idempotent and returns once infrastructure is ready (dev servers run as terminals).
set -euo pipefail
cd "$(dirname "$0")/.."

# --- Postgres ---
sudo pg_ctlcluster 16 main start 2>/dev/null || true
for _ in $(seq 1 30); do
  if sudo -u postgres pg_isready -q 2>/dev/null; then break; fi
  sleep 1
done

# --- Redis ---
if ! redis-cli ping >/dev/null 2>&1; then
  sudo redis-server /etc/redis/redis.conf --daemonize yes || true
fi

# --- Ensure role + database (idempotent) ---
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='wholesale'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE wholesale LOGIN PASSWORD 'password';"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='wholesale'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE wholesale OWNER wholesale;"

# --- Schema + seed (both idempotent) ---
pnpm --filter api db:migrate
pnpm --filter api db:seed

echo "[start] infrastructure ready (postgres + redis + schema + seed)"
