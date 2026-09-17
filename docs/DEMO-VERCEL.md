# Demo deploy (this `demo` branch only)

`main` stays local SQLite. This branch adds a Turso-capable Prisma adapter so **Vercel** can host a client demo.

Do not merge to `main` unless you want hosted DB in the default product.

## 1. Turso

```bash
# https://turso.tech — create a DB (region near PK: e.g. Singapore / Mumbai if listed)
turso db create raseed-demo
turso db show raseed-demo --url
turso db tokens create raseed-demo
```

From this repo, with those values in `.env`:

```bash
DATABASE_URL="libsql://raseed-demo-….turso.io"
TURSO_AUTH_TOKEN="…"
JWT_SECRET="a-long-random-string-at-least-16-chars"
npx prisma migrate deploy
npm run seed
```

## 2. Vercel

Import the Git repo, set **branch = `demo`** (not `main`).

Environment (Production + Preview):

| Name | Value |
|---|---|
| `DATABASE_URL` | Turso URL (`libsql://…`) |
| `TURSO_AUTH_TOKEN` | Turso token |
| `JWT_SECRET` | same long secret |
| `APP_URL` | `https://<project>.vercel.app` (or `https://demo.raseed.xyz`) |

Deploy. Optional: `demo.raseed.xyz` CNAME to `cname.vercel-dns.com`.

Logins after seed: `owner@raseed.local` / `owner123`, `bilal@raseed.local` / `booker123`.

## Switch back to local product

```bash
git checkout main
```

Local `.env` stays `DATABASE_URL="file:./prisma/dev.db"` — unchanged on `main`.
