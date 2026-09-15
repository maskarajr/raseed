# Raseed — design handoff

> **Status: APPROVED** · 15 Sep 2026 · approved for implementation as-is.

This is the implementation handoff for the Raseed operations surfaces. The design is
locked; the job now is to rebuild it as the real product, screen by screen, against the
tokens and component rules below. Read this file first, then open the two reference docs
you actually need (`components.md`, `screens.md`, `interactions.md`).

---

## 1. Approved baseline

| | |
|---|---|
| Reference artifact | `../raseed-ops-board.html` |
| Format | single self-contained HTML, 20 frames, 7 sections |
| Lines / size | 1,674 lines · 136,568 bytes |
| `sha256` | `3A7126F0C0B45FB86FEA042D0FAA73F9B6ADF4DB68EB9B1B679B0D9F1FFA6C1E` |
| Design tokens | `../brand-spec.md` + `raseed.css` (in this folder) |

The board is the **visual contract**. Treat it as read-only reference: open it side by
side with your work and match it. It is a click-through prototype — its inline CSS
contains board-only scaffolding (frame chrome, zoom, print-of-the-board rules) that must
**not** be copied into the app. Use `raseed.css` instead; it is the same design system
with the board scaffolding stripped.

## 2. Package contents

| File | Use |
|---|---|
| `README.md` | this file — approval, stack, routes, build order, rules |
| `raseed.css` | **the design system** — drop-in stylesheet (tokens + app components) |
| `tailwind-theme.js` | the same tokens as a Tailwind `theme.extend` fragment, if the app is on Tailwind |
| `components.md` | component contract: classes, states, tone map, do/don't |
| `screens.md` | all 20 screens mapped to routes, with data, states and acceptance criteria |
| `interactions.md` | behaviour specs: sheets, wizard, filters, toasts, print |

## 3. Target stack (assumed — confirm before scaffolding)

The route table in the brief (`/office/orders/[id]`, `/`, `/login`) reads as a Next.js
App Router app with role-based routing. The specs here are framework-neutral; if the app
is not Next.js, only the route→file mapping changes.

- Routing: Next.js App Router — `app/login`, `app/office/**`, `app/booker/**`, `app/page.tsx` (role redirect)
- Styling: CSS custom properties from `raseed.css`; map to Tailwind via `tailwind-theme.js` if Tailwind is already in the repo
- Two surfaces, one token set: **Office** = desktop app shell with icon rail; **Booker** = mobile PWA (`390px`, sticky bottom nav)
- Locale: `en-PK`, PKR, `Asia/Karachi`, office hours 09:00–19:00

## 4. Route map

`frame` is the `data-od-id` you can find the reference screen by inside the board.

### Auth and root

| Route | Screen | Frame | Viewport |
|---|---|---|---|
| `/login` | Credentials, role switch | `frame-login` | 1120 × 720 |
| `/` | Role redirect — owner → `/office`, booker → `/booker` | — | — |

### Office (desktop, 1120 × 720)

| Route | Screen | Frame |
|---|---|---|
| `/office` | Dashboard | `frame-office-dashboard` |
| `/office/reports` | Reports | `frame-office-reports` |
| `/office/orders` | Orders list | `frame-office-orders` |
| `/office/orders/[id]` | Order detail | `frame-office-order-detail` |
| `/office/invoices` | Invoices list | `frame-office-invoices` |
| `/office/invoices/[id]` | Invoice detail | `frame-office-invoice-detail` |
| `/office/invoices/[id]/print` | Print / PDF | `frame-office-print` |
| `/office/products` | Products / inventory (`?new=1` opens create) | `frame-office-products` |
| `/office/stock` | Stock ledger | `frame-office-stock` |
| `/office/customers` | Customers | `frame-office-customers` |
| `/office/bookers` | Bookers | `frame-office-bookers` |
| `/office/settings` | Settings | `frame-office-settings` |

Office rail groups **Overview** (Dashboard, Reports) and **Store** (Orders, Invoices,
Products, Customers). **Bookers / Stock / Settings are pages but are not in the primary
rail** — they live in the rail footer (`.rfoot`). Do not promote them.

### Booker PWA (mobile, 390 × 780)

| Route | Screen | Frame |
|---|---|---|
| `/booker` | Home | `frame-booker-home` |
| `/booker/orders` | My orders | `frame-booker-orders` |
| `/booker/orders/new` | Capture wizard | `frame-booker-capture` |
| `/booker/account` | Account | `frame-booker-account` |

Bottom nav: **Home / Orders / Account** only. The capture flow carries a sticky primary
CTA and safe-area padding.

### Overlays (not routes)

| Overlay | Launched from | Frame / anchor |
|---|---|---|
| Record payment sheet | Invoice detail · `Record payment` | `#sheet-payment` inside `frame-office-invoice-detail`; standalone `frame-overlay-payment` |
| Per-line return sheet | Invoice detail · `Log return` | `#sheet-return` inside `frame-office-invoice-detail`; standalone `frame-overlay-return` |
| New product sheet / drawer | Products · `New product`, or `?new=1` | drawer inside `frame-office-products`; standalone `frame-overlay-new-product` |

## 5. Hard rules (do not regress)

1. **Money is a component, never a string.** Always `Rs 12,450` — mono, tabular, thousands-separated. One `<Money>` primitive, used everywhere.
2. **Status is a pill from the five pairs only.** No invented tone, no coloured rows, no coloured body text. One label maps to one tone across both surfaces. Outstanding money is always `To collect` (`warn`); `bad` is only `Cancelled` / `Out of stock`.
3. **Green appears at most twice per screen** — the brand mark plus one primary action. Active nav, active filter chips, selected options, wizard dots and switches use `--fg` tints, never green.
4. **The booker owns the loop:** visit → capture order → office confirms and invoices → booker delivers and collects cash. Every booker screen shows collected vs booked.
5. **Payments are cash advance or partial. Never credit.** No installments, no credit terms, no due dates, no credit limits. An invoice carries two numbers only: collected to date and balance due. Copy implying a payment timeline is a defect.
6. **Light canvas is the default.** Rails, top bars and tables on `--surface`; working area on `--bg`. The dark set is an opt-in token block, never a fork of the light one — see §6.
7. **Numbers right, labels left, nothing wraps inside a table cell.** Do not re-enable wrapping to make a column fit; use `.tbl-wrap` for horizontal scroll on narrow tables instead.

## 6. Dark theme (PR #8), opt-in

PR #8's dark A/B is **not rendered on the approved board** — the board stays light, and
`docs/VISUAL.md` stays the light source of truth. It is resolved at the **token layer** instead:
`raseed.css` ships a second token block on `[data-theme="dark"]`, and nothing else changes with it.

**To enable:** set `data-theme="dark"` on `<html>` (or `<body>`). Every component rule reads
variables, so the whole surface re-themes with no component edit. It is scoped to `@media screen`,
so **print always resolves to light** — the invoice and `/office/invoices/[id]/print` keep their
paper appearance on either theme.

**Do not** hand-roll dark values in components, and do not build a dark office with a light booker
PWA — switching the two surfaces must happen together. The dark values, their OKLch derivations and
every verified contrast pair are in `../brand-spec.md` → *Dark theme (opt-in)*.

One consequence worth knowing before you touch the button: on a dark canvas the accent has to be
luminous to read, so **ink on it is a deep green**, not white. That is why `raseed.css` extracted
`--on-accent`, `--accent-hover`, `--scrim` and `--knob` into tokens — the six locked colours alone
cannot express dark mode, and `--scrim` is the clearest case: it is `--fg` at 42%, which would
paint a *white* scrim over a dark screen.

Still open for a human: `docs/VISUAL.md` should be amended with the dark canvas token, or the dark
set remains an undocumented app-level opt-in.

## 7. Build order (tracer bullets)

Each step is independently shippable and leaves the app runnable.

1. **Tokens + primitives** — `raseed.css` (or Tailwind theme), then `StatusPill`, `Money`, `Button`.
2. **Shells** — Office `AppShell` (rail + appbar + content) and Booker PWA shell (status bar + top bar + body + bottom nav).
3. **Auth** — `/login` with role switch, `/` role redirect.
4. **Read-only lists** — Orders, Invoices, Products, Stock, Customers, Bookers, Reports (static data first).
5. **Detail + money flows** — Order detail, Invoice detail, then the payment and return sheets.
6. **Print** — `/office/invoices/[id]/print` as a print-only document.
7. **Booker flow** — Home, My orders, Account, then the 3-step capture wizard.
8. **Create flows** — `?new=1` product drawer, customer create, booker invite.

## 8. Definition of done

- Every route in §4 renders from real components bound to the tokens in `raseed.css`.
- The tone map in `components.md` is enforced by the `StatusPill` API, not by ad-hoc classes.
- No raw hex outside the token layer; no gradients; no emoji as icons.
- All interactive states have a visible `:focus-visible` ring (see `raseed.css` — production addition not present in the click-through board).
- Accent budget holds: at most two green marks visible per screen.
- Wizard math reconciles: `total = Σ(qty × price)`, `advance ≤ min(10,000, total)`, `balance = total − advance`.

## 9. Known scope boundaries

- The board is high-fidelity UI only — no backend, no real persistence. Wire data to the app's own layer.
- Sample data is illustrative but internally consistent (invoice totals, collected vs balance, report averages). Preserve the math if you reuse it; do not invent new metrics.
- No content imagery is required for these screens; the surfaces are pure product UI.
