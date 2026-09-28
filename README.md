# Raseed

**Wholesale distribution operations, end to end.**

Raseed is the operating system for a wholesale distribution agency. It connects the field sales force and the back office into one closed loop: an order captured on a phone in the market flows straight into stock, invoicing, collections, and reporting — without re-keying, spreadsheets, or phone-call status checks.

## Two surfaces, one flow

- **Booker app** (`/booker`) — a mobile-first, installable web app for field salesmen (bookers). They browse the catalogue, check live stock, create and submit retailer orders on the spot, and track their own collections and returns.
- **Office dashboard** (`/office`) — the desktop back office. It manages products and stock, customers and bookers, the full order pipeline, invoices with print-ready PDF output, payments, returns, and reports.

The root of the app routes each person to the right surface based on their role. Bookers only ever see and act on their own data; the office has the complete picture.

## What it handles

- **Order capture** — bookers draft or submit orders in seconds, with live prices and stock levels visible while they build the cart. Drafts can be edited and submitted later; nothing is lost mid-market.
- **Order lifecycle** — every order moves through a server-enforced pipeline: `draft → submitted → confirmed → invoiced → out_for_delivery → delivered → settled` (or cancelled). No stage can be skipped or faked from the client.
- **Stock** — every movement (sales, returns, purchases) is written through a single audited path with a stock ledger, so inventory figures always trace back to a reason.
- **Invoicing** — confirming an order lets the office generate an invoice in one step: stock deducts, the order flips to invoiced, and a print-ready invoice (browser Print-to-PDF) is produced for delivery with the goods.
- **Returns** — logged against an invoice: stock restocks, the invoice balance adjusts down, and the booker's ledger reflects it — all atomically.
- **Payments & collections** — cash or credit payments update the invoice balance; partial payments are normal. A fully prepaid order settles itself the moment its balance reaches zero — settlement is balance-driven, never a manual button.
- **Reports** — collection vs. outstanding by booker and route, so the office knows exactly who owes what at the end of the day.

## Money and language

Currency is **PKR**; the interface is **English**. Amounts are treated as whole rupees throughout, matching how FMCG wholesale is priced in practice.

## How it's used

Raseed runs as a single web app used during office hours (online-only). The booker experience is a PWA: field salesmen open the office's web address on their phone and "Add to Home Screen" — no app store, no per-device install ceremony.

## Where the details live

This README describes the product. Engineering and operations detail lives in:

- `docs/DEVELOPMENT.md` — local setup, tech stack, architecture, and business-rule internals.
- `docs/PREVIEW.md` — running a local preview build.
- `docs/DEMO-VERCEL.md` — the hosted demo environment.
