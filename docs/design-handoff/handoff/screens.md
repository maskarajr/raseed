# Raseed — screen specs

Every screen in the approved board, mapped to its route. `frame` is the `data-od-id` you
can find it by in `../raseed-ops-board.html`. Viewports: Office `1120 × 720`, Booker PWA
`390 × 780`.

Per screen: **layout**, **contents**, **actions**, **acceptance**. Components referenced by
name are specified in `components.md`; behaviour in `interactions.md`.

---

# Auth

## `/login` — Credentials
`frame-login` · 1120 × 720

**Layout** — two columns: form on `--surface`, brand panel on `--bg` with a left border.
**Contents** — wordmark; work-email field; password field; `Continue as` role selector
(Owner / Booker, single-select). Owner resolves to `/office`, Booker to `/booker`.
**Actions** — `Sign in` (the screen's single primary, block).
**Acceptance** — email field is labelled **work email** (not mobile number); the role choice
is explicit and switches the post-login destination; no accent is used on the role options
(selected state is `--fg`, per the accent budget).

---

# Office — desktop

## `/office` — Dashboard
`frame-office-dashboard`

**Layout** — appbar; 4-up KPI row; then a two-column content area: "Orders awaiting
confirmation" card plus a billing rail and quick actions.
**Contents**
- KPIs: **Booked today** `Rs 512,300` (38 orders · +6 vs yesterday) · **Outstanding**
  `Rs 1,240,500` (14 invoices open) · **Awaiting confirmation** `6` (Oldest 42 min) ·
  **Low stock SKUs** `7` (1 out of stock)
- Appbar subtitle: today's date · `office hours 09:00–19:00`
- "Orders awaiting confirmation" — the needs-attention list, `View all` ghost action
- Billing rail — outstanding vs collected
**Actions** — `New order` (single primary).
**Acceptance** — KPI set is exactly the four above; every KPI value is a `Money` or a count;
`View all` filters the list rather than navigating away.

## `/office/reports` — Reports
`frame-office-reports`

**Layout** — appbar with a range `SegmentedControl`; KPI row; "By booker" breakdown card;
chart.
**Contents**
- Range: 01–15 Sep 2026
- KPIs: **Orders** `412` · **Value** `Rs 6,184,200` (Avg `Rs 15,010` / order) ·
  **Collections** `Rs 4,930,700` (79.7% of invoiced) · **Returns** `Rs 88,400`
  (1.4% of value)
- "By booker" — 5 active, one row per booker with value and collection
**Actions** — range switch, export/print if present.
**Acceptance** — the range control is neutral (never green); the chart is a filled data
encoding, not an empty outline; the average reconciles (`6,184,200 / 412 = 15,010`).

## `/office/orders` — Orders list
`frame-office-orders`

**Layout** — appbar (`6 shown · 38 placed today`, `New order` primary); a filter row:
`FilterChipBar` left, search right; full-width `DataTable` in a card.
**Contents** — chips `All · Scheduled · Confirmed · Awaiting · Draft`; search placeholder
"Order or customer". Columns: Order · Customer · Booker · Placed · Value · Status.
Six rows across Scheduled, Confirmed, Awaiting confirm, Confirmed, Cancelled, Draft.
**Actions** — row → `/office/orders/[id]`; `New order`.
**Acceptance** — the `All` chip is the reset (empty `data-f`); each chip narrows to a
non-empty set; the `.tbl-empty` state appears when a filter matches nothing; the
`[data-count]` in the subtitle tracks the visible rows.

## `/office/orders/[id]` — Order detail
`frame-office-order-detail`

**Layout** — appbar with breadcrumb `Orders / RS-4819`, title + `StatusPill`; a two-column
content split: line items and totals on the left, a `Customer` card and a `Timeline` rail on
the right.
**Contents** — `RS-4819` · `Awaiting confirm`; line items (11 lines) with qty, rate, amount;
`TotalsBlock` (subtotal, freight, grand total); customer block; lifecycle timeline.
**Actions** — `Confirm order` (single primary); secondary lifecycle actions as needed
(cancel, invoice).
**Acceptance** — lifecycle pill matches the current step; timeline dots use `--fg` for done,
never green; only one green action visible.

## `/office/invoices` — Invoices list
`frame-office-invoices`

**Layout** — same shape as Orders: appbar + chips + search + `DataTable`.
**Contents**
- Subtitle: `Rs 1,240,500 outstanding · Rs 50,000 collected on route today`
- Chips: `All · To collect · Paid · Draft`
- Columns: Invoice · Customer · Booker · Issued · Collected · Value · Status
- Rows: INV-2291 Al-Madina Store (04 Sep, —, `Rs 42,800`, To collect) · INV-2290 Karachi
  Grocers (02 Sep, `Rs 18,450`, `Rs 18,450`, Paid) · INV-2289 Shaheen Traders (28 Aug,
  `Rs 50,000`, `Rs 96,200`, To collect) · INV-2288 Bismillah Mart (26 Aug, `Rs 27,600`,
  `Rs 27,600`, Paid) · INV-2287 Noor Cash & Carry (22 Aug, `Rs 61,050`, `Rs 61,050`, Paid) ·
  INV-2286 Gulshan Superstore (20 Aug, —, `Rs 38,900`, Draft)
**Actions** — row → `/office/invoices/[id]`; `Record payment`.
**Acceptance** — `Paid` and `To collect` are disjoint filter terms (a substring collision
between `Paid` and `Unpaid` was a real bug — the vocabulary is `To collect` for this reason);
`Collected` is `—` for draft/unpaid rows, never `Rs 0`.

## `/office/invoices/[id]` — Invoice detail
`frame-office-invoice-detail`

**Layout** — appbar breadcrumb `Invoices / INV-2291`, title + `To collect` pill; content:
`Charges` card (line items + `TotalsBlock` + `DefinitionList`), `Billed to` block, and a
`Payment history` block.
**Contents** — issued / delivery / collection (COD) / collects / received / balance; charges
sourced from the order (`from order RS-4788`).
**Actions** — `Print` (secondary) · `Log return` (secondary) · `Record payment` (opens the
payment sheet).
**Acceptance** — the header's green count is at most one when no overlay is open; opening the
payment or return sheet dims the base and the sheet owns the only green; balance equals
value − received.

## `/office/invoices/[id]/print` — Print / PDF
`frame-office-print`

**Layout** — a print-only `.doc`, no app chrome: header rule with issuer block, document
type pill (`TAX INVOICE`, `neu`), document number and dates; billed-to / booker / collection
block; line-items table; totals; footer note.
**Contents** — `Raseed Traders`, Plot 14 SITE Area Karachi, `021 3456 7890`, NTN/STRN;
`INV-2289`, issued 28 Aug 2026, delivered 29 Aug 2026; billed to Shaheen Traders (Gulshan
Block 6, Route 5); booker Sana Iqbal; collection `Cash on delivery · Advance or part payments
accepted`; lines Basmati Rice 25kg (5 × `Rs 11,900`), Sugar 50kg (4 × `Rs 6,400`), Red
Lentils 5kg (6 × `Rs 1,780`), Freight `Rs 420`; subtotal `Rs 96,200`, received `Rs 50,000`,
to collect `Rs 46,200`.
**Actions** — `Print` → `window.print()`.
**Acceptance** — the route is the printable artefact: no rail, no appbar; the grand total
labels are `To collect` (never `Balance due`); amounts reconcile with the list row.

## `/office/products` — Products / inventory
`frame-office-products`

**Layout** — appbar (`6 shown · 41 active SKUs`, `New product` primary); chips + search;
`DataTable`; a product-details drawer.
**Contents** — category chips `All · Rice · Oil · Grocery · Pulses`; columns SKU ·
Product · Category · Pack · On hand · Reorder · Status; statuses `In stock` / `Low` / `Out`.
Drawer shows SKU (e.g. `RS-BR5`), pricing, stock and reorder level.
**Actions** — `New product` opens the create drawer; with `?new=1` the drawer is open on
load; row opens `Product details`.
**Acceptance** — `Out` is `bad`, `Low` is `warn`, `In stock` is `ok`; the table is the only
scroller and does not bleed; create drawer is a `.drawer`, never a new route.

## `/office/stock` — Stock ledger
`frame-office-stock`

**Layout** — appbar (`Godown A · last counted 14 Sep 2026`); a 7-column movements/intake
table sharing its row with a narrow "Recent movements" rail.
**Contents** — SKU, item, pack, on hand, reorder, value, status; movements rail lists
movements and their cause (invoice deduct, return restock).
**Actions** — filter/search; row → product.
**Acceptance** — the table **must** sit in `.tbl-wrap` with `.tbl.tight`; the rail is
`224px`. Without the wrapper the nowrap columns paint over the rail (this was a shipped
defect). Ledger entries distinguish a deduct (invoice) from a restock (return).

## `/office/customers` — Customers
`frame-office-customers`

**Layout** — appbar (`6 shown · 214 active shops`), search + `New customer` primary;
`DataTable`.
**Contents** — columns Shop · Area · Route · Booker · Outstanding · Status. Rows: Al-Madina
Store (Saddar, Route 3, Ahmed Raza, `Rs 42,800`) · Karachi Grocers (Clifton, Route 1, Bilal
Khan, `Rs 0`) · Shaheen Traders (Gulshan, Route 5, Sana Iqbal, `Rs 46,200`) · Bismillah Mart
(Korangi, Route 3, Ahmed Raza, `Rs 17,500`) · Noor Cash & Carry (North Nazimabad, Route 2,
Usman Ali, `Rs 0`, Inactive) · Gulshan Superstore (Gulshan, Route 4, Hina Shah, `Rs 0`).
**Actions** — search (Shop / area / route); `New customer`; row → customer.
**Acceptance** — the `Status` column is **account lifecycle** (`Active` / `Inactive`), not
payment state. Outstanding money lives in the `Outstanding` column only; do not repeat it as
a pill (a `Balance due` pill here was a real defect).

## `/office/bookers` — Bookers
`frame-office-bookers`

**Layout** — appbar (`5 on the road today · 1 on leave`, `Add booker` primary); `DataTable`
of bookers.
**Contents** — columns Booker (`Person`/avatar) · Route · Phone · Orders today · Value today
· Collected · Status. Rows: Ahmed Raza (Route 3, 0300 1234567, 9, `Rs 128,400`, `Rs 91,000`,
Confirmed) · Bilal Khan (Route 1, 0301 7654321, 6, `Rs 74,900`, `Rs 74,900`, Confirmed) ·
Sana Iqbal (Route 5, 0301 9988776, 11, `Rs 96,200`, `Rs 50,000`, Awaiting confirm) · Usman
Ali (Route 2, 0302 4455667, 7, `Rs 61,050`, `Rs 61,050`, Scheduled) · Hina Shah (Route 4,
0303 1122334, 5, `Rs 38,900`, `Rs 0`, Draft).
**Actions** — `Add booker` (invite); per-row activate/deactivate and reset password.
**Acceptance** — `Value today` and `Collected` are separate columns because collection is
the booker's measure; a booker who booked but has not collected shows the gap.

## `/office/settings` — Settings
`frame-office-settings`

**Layout** — appbar (`Business, roles and appearance`); a two-column card grid.
**Contents** — `Business` card; `Roles` card (permissions, including "Bookers can see
outstanding balances"); `Appearance` card carrying the PR #8 note (status pill
`Not shipped`); `Session` card (signed-in identity, active pill, sign out).
**Actions** — `Save`; sign out.
**Acceptance** — the Appearance card is the in-product home of the PR #8 dark-A/B flag and
must say it is not shipped; there is no credit-limit permission anywhere (a rejected toggle);
sign out is present and reachable.

---

# Booker — PWA

Booker chrome is constant: a status strip, an appbar (`.pbar`), the scroll body, and a
bottom nav of exactly **Home / Orders / Account**. The capture flow swaps the bottom nav for
a sticky primary CTA with safe-area padding.

## `/booker` — Home
`frame-booker-home`

**Layout** — appbar greeting `Salaam, Ahmed` with an offline-queue button; metric cards;
"Next stops"; CTA.
**Contents** — `Today's orders` `9`; `Collections` vs target (status `On track`); next stops
with `Scheduled` / `Confirmed` / `To collect` pills; recent activity.
**Actions** — `New order` (primary, block) → `/booker/orders/new`; next-stop row → order.
**Acceptance** — greeting is the signed-in booker's first name; the collection metric shows
booked vs collected (the booker's core measure); PWA has no horizontal scroll at 390px.

## `/booker/orders` — My orders
`frame-booker-orders`

**Layout** — appbar `My orders` with back and a `6 today` meta; chips; a card list
(`.pcard`), not a table.
**Contents** — chips `All · Scheduled · To collect · Collected`; one card per order with
customer, route, amount, status pill, and a `Collect` action on the to-collect cards.
**Actions** — card → order; `Collect` → record collection.
**Acceptance** — the chip filter drives `[data-row]` on the cards (there is no table body
here); cards must carry `data-row` or filtering silently does nothing (this was a real bug);
outstanding cards use `To collect` (`warn`), never `Balance due`.

## `/booker/orders/new` — Capture wizard
`frame-booker-capture`

**Layout** — appbar `New order` with back and a step counter (`Step 2 of 3`); three
progress dots; the step body; a sticky footer CTA.
**Steps**
1. **Pick the shop** — searchable customer list.
2. **Add products** — qty steppers, soft stock warning (`Warnbox`), running line total.
3. **Advance and submit** — review with the large total; `Advance` and `Collect on delivery`
   rows; submit.
**Actions** — `Continue` advances; the last step's button becomes `Submit order`; back
navigates steps; submit is disabled until a line has qty > 0.
**Acceptance** — soft stock warning never blocks; review math is
`total = Σ(qty×price)`, `advance = min(10,000, total)`, `balance = total − advance`; the step
title is "Advance and submit" and no copy implies installments or credit.

## `/booker/account` — Account
`frame-booker-account`

**Layout** — appbar `Account`; a stacked set of `.pcard`s.
**Contents** — name, email, role; locale row (PKR, English); today's summary (`9` orders,
`Rs 128,400` booked, `Rs 37,400` left to collect, `Up to date`); sign out.
**Actions** — sign out.
**Acceptance** — locale shows PKR and English; the summary reconciles with the bookers table
(Ahmed Raza: 9 orders, `Rs 128,400` booked, `Rs 91,000` collected → `Rs 37,400` to collect).

---

# Overlays

| Overlay | Frame | Spec |
|---|---|---|
| Record payment | `frame-overlay-payment`, inline `#sheet-payment` | Modal sheet. `Record payment · INV-2291`; type options **Part payment / Cash advance / Full settlement**; `Amount collected`; method (Cash / Cheque / …); `Cancel` + `Record payment`. Toast on submit reports the new balance. |
| Log return | `frame-overlay-return`, inline `#sheet-return` | Modal sheet. `Log return · INV-2294`; per-line returned qty; restock note; `Return value`; `Cancel` + `Log return`. Toast reports stock restocked, pending office approval. |
| New product | `frame-overlay-new-product`, drawer in `frame-office-products` | Drawer. `New product` fields (SKU, description, pack, pricing, reorder level); `Cancel` + `Create product`. |

**Acceptance for all three** — the base appbar is dimmed while open, so the sheet owns the
only green; the scrim closes on click; each sheet's cancel is secondary and its confirm is
the single primary; the payment sheet offers advance/partial/settlement only, never a
payment plan.

---

# Sample dataset (reuse it so screens reconcile)

Do not invent a parallel dataset — these values cross-check across screens.

| Customer | Area | Route | Booker | Outstanding | Status |
|---|---|---|---|---|---|
| Al-Madina Store | Saddar | 3 | Ahmed Raza | `Rs 42,800` | Active |
| Karachi Grocers | Clifton | 1 | Bilal Khan | `Rs 0` | Active |
| Shaheen Traders | Gulshan | 5 | Sana Iqbal | `Rs 46,200` | Active |
| Bismillah Mart | Korangi | 3 | Ahmed Raza | `Rs 17,500` | Active |
| Noor Cash & Carry | North Nazimabad | 2 | Usman Ali | `Rs 0` | Inactive |
| Gulshan Superstore | Gulshan | 4 | Hina Shah | `Rs 0` | Active |

| Invoice | Customer | Booker | Issued | Collected | Value | Status |
|---|---|---|---|---|---|---|
| INV-2291 | Al-Madina Store | Ahmed Raza | 04 Sep | — | `Rs 42,800` | To collect |
| INV-2290 | Karachi Grocers | Ahmed Raza | 02 Sep | `Rs 18,450` | `Rs 18,450` | Paid |
| INV-2289 | Shaheen Traders | Sana Iqbal | 28 Aug | `Rs 50,000` | `Rs 96,200` | To collect |
| INV-2288 | Bismillah Mart | Ahmed Raza | 26 Aug | `Rs 27,600` | `Rs 27,600` | Paid |
| INV-2287 | Noor Cash & Carry | Usman Ali | 22 Aug | `Rs 61,050` | `Rs 61,050` | Paid |
| INV-2286 | Gulshan Superstore | Hina Shah | 20 Aug | — | `Rs 38,900` | Draft |

Bookers: Ahmed Raza (Route 3, `0300 1234567`) · Bilal Khan (Route 1, `0301 7654321`) ·
Sana Iqbal (Route 5, `0301 9988776`) · Usman Ali (Route 2, `0302 4455667`) ·
Hina Shah (Route 4, `0303 1122334`).

Catalog: `RS-BR25` Basmati Rice 25kg · `RS-SU50` Sugar 50kg · `RS-LE5` Red Lentils 5kg ·
`RS-BR5` (drawer item). Categories: Rice, Oil, Grocery, Pulses. Warehouse: Godown A.

Key reconciliations: `59,500 + 25,600 + 10,680 = 95,780` rice/sugar/lentils lines plus
freight `Rs 420` against the typed subtotal `Rs 96,200`; `96,200 − 50,000 = 46,200`;
`42,800 − 20,000 = 22,800` (INV-2291 after a part payment); `6,184,200 / 412 = 15,010`.
If you change an amount, re-check the row it feeds.
