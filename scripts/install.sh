#!/usr/bin/env bash
# Idempotent repository bootstrap: system services + JS deps + shared build.
set -euo pipefail
cd "$(dirname "$0")/.."

# System services (no-op when the base snapshot already contains them).
if ! command -v pg_ctlcluster >/dev/null 2>&1 || ! command -v redis-server >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql postgresql-contrib redis-server
fi

# Local env file for dev (safe default; never committed).
[ -f .env ] || cp .env.example .env

# Workspace dependencies + shared types build (apps import @wholesale/shared).
pnpm install
pnpm build:shared

echo "[install] complete"
