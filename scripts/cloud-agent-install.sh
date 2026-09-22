#!/usr/bin/env bash
set -euo pipefail

# Idempotent Cloud Agent bootstrap for Raseed (Next.js 14 + Prisma 7 + SQLite).
# Safe to re-run: npm install, prisma generate (via postinstall), migrate deploy,
# and seed are all idempotent.

cd "$(dirname "$0")/.."

# Local dev env file (SQLite + dev JWT secret). Never overwrite an existing .env.
if [ ! -f .env ]; then
  cp .env.example .env
fi

npm install

# Apply committed migrations to the local SQLite database, then seed idempotently.
npx prisma migrate deploy
npm run seed
