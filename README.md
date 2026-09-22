# Raseed — Wholesale Distribution Ops (v1)

Raseed is a self-hosted operations tool for a wholesale distributor (agency). It runs on the owner's Windows office PC with a local SQLite database and is used during office hours (online-only). It has two surfaces in a single Next.js app: a mobile-first **Booker PWA** (`/booker`) where field salesmen capture retailer orders, and a desktop **Office dashboard** (`/office`) for the full back-office — products, stock, customers, bookers, orders, invoices (with print-to-PDF), payments, returns, and reports. Currency is **PKR**; language is **English**.

## Tech stack

- Next.js 14 (App Router) + TypeScript
- Prisma ORM 7 + SQLite via `@prisma/adapter-libsql` (`prisma/dev.db`) — generated types live in `src/generated/prisma`
- Tailwind CSS
- Zod for all request validation
- Auth: credentials (email + password, bcrypt), session in an httpOnly JWT cookie (`jose`)
- Invoice "PDF": print-friendly HTML page + `window.print()` (browser Print-to-PDF)
- PWA: `public/manifest.webmanifest` + a basic service worker (`public/sw.js`)

Client **Vercel demo** (Turso, not the SQLite file) lives on the `demo` branch — see `docs/DEMO-VERCEL.md`. Keep `main` for local Windows.

## Prerequisites (Windows)

- Install **Node.js 20.19+** (22.x recommended) for Windows (from https://nodejs.org). This includes `npm`.
- Open **PowerShell** or **Command Prompt** in the project folder.

## Setup & run (Windows)

```bat
npm install
copy .env.example .env
npx prisma generate
npx prisma migrate deploy
npm run seed
npm run build
npm start
```

Then open http://localhost:3000.

- Office dashboard: http://localhost:3000/office
- Booker PWA: http://localhost:3000/booker
- The root URL redirects to the right surface based on your role.

For day-to-day development you can instead run:

```bat
npm run dev
```

> On Windows, `copy .env.example .env` is the Command Prompt form. In PowerShell use `Copy-Item .env.example .env`. `.env` already ships with sane local defaults (`DATABASE_URL="file:./prisma/dev.db"`), so you mainly need to set a strong `JWT_SECRET` before real use. Prisma CLI does not load `.env` by itself — `prisma.config.ts` loads `dotenv`. After changing the schema always run `npx prisma generate`. Success looks like **Generated Prisma Client (7.10.0) to ./src/generated/prisma**. If it still says **v5.22.0** and writes to `node_modules\@prisma\client`, this checkout is old or `prisma@latest` (v8 RC) was installed on top. Do **not** run `npm i prisma@latest`. Reset to the lockfile on this branch:

```powershell
git fetch origin
git checkout cursor/design-handoff-truth-b7d6
git restore package.json package-lock.json
Remove-Item -Recurse -Force node_modules
npm install
npx prisma generate
```

`generate` must print **7.10.0**. SQLite goes through `@libsql/client` (Windows prebuild), not `better-sqlite3` (that package needs a blocked `node-gyp` script). After pull:

```powershell
git pull
npm install
npx prisma migrate deploy
npm run seed
npm run dev
```

Ignore `npm audit fix --force` and the Next 14.2.15 security notice for this install.

## Seeded login credentials

`npm run seed` prints these to the console and creates them in the database:

| Role   | Surface | Email               | Password   |
| ------ | ------- | ------------------- | ---------- |
| owner  | Office  | `owner@raseed.local`| `owner123` |
| booker | PWA     | `bilal@raseed.local`| `booker123`|
| booker | PWA     | `sana@raseed.local` | `booker123`|

Also seeded: ~8 FMCG/grocery products (PKR prices) and 5 sample retailer customers.

Roles: `owner` and `office` share full office access; `booker` gets the PWA only and can only ever see/act on their own data.

## Vertical-slice happy path

auth → products/stock seeded → customer created → booker creates + submits order → office confirms → office invoices (stock deducts) → office logs a return (stock restocks, invoice balance adjusts, ledger entry) → payment recorded.

## Automated end-to-end test

With the app running (e.g. `npm start` on port 3000), in a second terminal:

```bat
npm run e2e
```

This logs in as booker and office, drives the entire happy path against the real HTTP API, and asserts stock deduction, restock-on-return, invoice balance adjustment, ledger rows, and payment status. It prints `PASS`/`FAIL` per check and a summary. Override the target with `APP_URL`, e.g. `set APP_URL=http://localhost:3100 && npm run e2e`.

## Business rules enforced

- **Order lifecycle** (server-validated transitions): `draft → submitted → confirmed → invoiced → out_for_delivery → delivered → settled`, or `cancelled`. `settled` is **balance-driven**: an order settles automatically the moment its invoice balance reaches Rs 0 (via payment, or a return that clears the balance) — it is never a manual button.
- **Stock isolation**: every `stockQty` change and `StockLedger` write goes through the single module `src/server/services/stock.ts` (`applyStockMovement`).
- **Transactions**: every write touching orders/invoices/products/stock/returns/payments runs in a Prisma `$transaction`.
- **Zod everywhere**: request body and query are validated by colocated schemas in `src/server/schemas/` before any logic.
- **`requireRole` wrapper**: a single `requireRole(...roles)` helper (`src/server/auth/requireRole.ts`) gates every protected API route — no inline role checks.
- **Booker scoping**: booker requests are always filtered to `bookerId = session.user.id`.
- **Soft stock warning**: ordering more than available returns a non-blocking warning; submission is never blocked.
- **Invoicing**: confirming an order lets office generate an invoice — creates the invoice, sets the order `invoiced`, and deducts stock (`sale` ledger reason) in one transaction.
- **Returns**: office logs product + qty against an invoice → restock (`return` reason) + invoice total/balance/status adjust down + ledger row, all in one transaction.
- **Payments**: cash on delivery. Collect on the invoice only (part or full) — never credit, never a cash advance on the order. Payments update `amountPaid`/`balance`/`paymentStatus`; the record-payment sheet defaults to the outstanding balance; a single payment cannot exceed the remaining balance. **Balance due** / **To collect** is outstanding collection, not a credit sale. Invoice totals: **Subtotal · Returns (−) · Paid · Balance due**, where `Balance due = line totals − returns − payments`.

## Making it reachable to bookers (remote access)

The app binds to the office PC. To let bookers reach it from the field — and to satisfy the **HTTPS requirement** for installing the PWA on iPhone/Android — expose it through a tunnel that provides a public HTTPS URL:

- **Cloudflare Tunnel**: install `cloudflared`, then run `cloudflared tunnel --url http://localhost:3000`. It prints a `https://…trycloudflare.com` URL (or configure a named tunnel on your own domain for a stable address).
- **Tailscale**: install Tailscale on the office PC and each phone, join the same tailnet, then use **Tailscale Serve/Funnel** (`tailscale serve https / http://localhost:3000`) to get an HTTPS endpoint.

Open the HTTPS URL's `/booker` route on the phone and use the browser's "Add to Home Screen" / "Install app" to install the PWA.

**Windows Firewall**: the tunnel makes the outbound connection, so you generally do **not** need to open inbound ports. If you instead expose the port directly on the LAN, add an inbound rule allowing TCP **3000** for the Private network profile (Windows Defender Firewall → Advanced settings → Inbound Rules → New Rule → Port → TCP 3000).

## Project layout

```
prisma/
  schema.prisma          # SQLite data model (single source of row types)
  seed.ts                # owner + bookers + products + customers
  migrations/            # generated migration(s)
public/
  manifest.webmanifest   # PWA manifest (start_url /booker)
  sw.js                  # basic service worker (installable, online-only)
  icon-192.png, icon-512.png
scripts/
  e2e.ts                 # end-to-end vertical-slice test (tsx)
src/
  lib/                   # prisma client, enums, password (bcrypt), money, fetch client
  server/
    auth/                # session (jose JWT cookie) + requireRole wrapper
    schemas/             # Zod schemas (body + query) per resource
    services/            # stock (isolated), orders, invoices, returns, payments, reports
    http.ts              # json/error helpers + parseBody/parseQuery
  app/
    login/               # shared credentials login
    office/              # desktop back-office (products, stock, customers, bookers,
                         #   orders, invoices + print, reports)
    booker/              # mobile-first PWA (home stats, customers, orders, new order)
    api/                 # route handlers for all resources
  components/            # nav, badges, logout, service-worker register
```

## Notes / assumptions

- **Money is stored as integer whole PKR** (not paisa/Decimal). FMCG wholesale prices are whole-rupee in practice, and integers avoid floating-point/Decimal-serialization issues. Update `Product.price` handling if sub-rupee pricing is ever needed.
- **SQLite has no native enums in Prisma**, so enum-like fields (`role`, order `status`, ledger `reason`, `paymentStatus`, payment `mode`) are `String` columns whose allowed values are enforced centrally by Zod + TypeScript unions in `src/lib/enums.ts`.
- **Negative stock is allowed**: because the stock warning is non-blocking, invoicing an over-sold product can drive stock below zero (it is corrected by a later purchase). This keeps invoicing from ever failing.
- **Session lifetime** is 12 hours (office-hours usage).
