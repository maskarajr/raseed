# Calculations — the money rules of Raseed

Ratified by Privy (seq447), found with Figmi (seq444). Single source:
`src/lib/money.ts` (`openOrders` / `bookedSum` / `toCollectSum` / `collectedSum`).
Every rupee figure in the UI must come from these functions — no local
`orders.reduce(...)` sums in pages (gate 26).

## The one rule to remember

> **A draft is work, never a rupee.**

Draft and cancelled orders are excluded from every money sum (`openOrders`).
They still count toward workload views — order counts, "Bills open", stop
lists — because a draft is real work for the booker. Money-excludes,
workload-includes.

## The three sums (booker strip, home hero, and anything like them)

For each open order (`status ∉ {draft, cancelled}`), all values integer PKR:

- **Booked** = Σ `subtotal`
- **To collect** = Σ `max(0, invoice.balance ?? 0)` — only invoiced debt
- **Collected** = Σ `min(subtotal, invoice.amountPaid ?? 0)` — real cash on
  the invoice, capped at the order's own subtotal so a mis-keyed or refunded
  invoice can never push the strip above what was booked.

`Collected` is **not** `Booked − To collect`. The residual was the original
bug: it silently reclassified not-yet-invoiced bookings and drafts as
collected cash. Probe on the demo DB (bilal, 2026-09-29): pre-fix Collected
Rs 186,340; post-fix Rs 145,930 — the old formula claimed Rs 40,410 that
never landed, Rs 5,280 of it from draft ORD-00009 alone.

## Machine gates

- **Gate 26**: no `orders.reduce(` appears in `src/app` — pages call
  `money.ts`, they don't re-derive sums.
- **Gate 27 (draft/cancel invariance)**: toggling any order to `draft` or
  `cancelled` must change no money tile (`bookedSum`, `toCollectSum`,
  `collectedSum` all route through `openOrders`). Verified by construction
  plus the demo-DB probe above; the live draft fixture ORD-00009 is kept
  as the standing witness.
