# Raseed — Visual Reference (v2)

Authoritative chrome values. Future passes MUST snap to these exactly; do not invent hexes. **Look only** — do not change services, Prisma, or API behavior to match this file.

Theme is **light only**. No dark mode, glass, gradients, illustrations, or AI chrome.

## Design tokens

| Token | Hex | Notes |
| --- | --- | --- |
| `--bg` | `#FAFAFA` | Page canvas |
| `--surface` | `#FFFFFF` | Cards, sheets, tables |
| `--border` / `--line` | `#E6E6E6` | 1px borders everywhere |
| `--text` / `--ink` | `#0A0A0A` | Primary copy |
| `--text-muted` / `--muted` | `#737373` | Secondary copy, inactive nav |
| `--primary` | `#0B6E4F` | Deep green accent |
| `--primary-hover` | `#095A41` | Primary button hover |
| `--primary-soft` | `#F3F7F5` | Near-white green tint only — never paint KPI cells or tables |
| `--accent` | `#C45C26` | Functional (returns, etc.) |
| `--danger` | `#B42318` | Functional |
| `--warning` | `#B54708` | Functional |
| `--success` | `#067647` | Functional |

Primary green is used **only** for:

1. Primary CTA buttons (`.btn-primary`)
2. Active office/booker nav item (text + quiet `--primary-soft` fill)
3. The **Raseed** wordmark

Do not greenwash KPI cells, tables, totals, or status chips. Danger / warning / success stay semantic but quiet.

Implemented in `src/app/globals.css` and `tailwind.config.ts`.

## Type

| Role | Face | Where |
| --- | --- | --- |
| UI chrome | `"Segoe UI", system-ui, sans-serif` | Body, labels, buttons, nav, table headers/cells (non-money) |
| Hero money | **Georgia** (serif) | Office Home KPI **values**, invoice **Balance due** value, Booker Review **Total** |
| Table Rs | `"Cascadia Mono", "Segoe UI Mono", ui-monospace` + `font-variant-numeric: tabular-nums` | All table money columns via `<Money>` (default) |

**Never serif in table columns.** Hero money uses `<Money variant="hero">` (class `.money-hero`). Default `<Money>` is mono + tabular (`.tnum`).

Body size: 14px.

## Structure

**Office (Option 2):** left nav **~200px**, labeled, **icon + text always visible** (no icon-only collapse). Home/Dashboard links to `/office`. Active item: primary text on `--primary-soft`. Inactive: muted.

**Booker:** bottom nav, thumb-first (≥44px tap targets), plain labels: Home / Orders / Account. Sticky new-order CTA keeps `env(safe-area-inset-bottom)`.

## Craft

- 1px borders `#E6E6E6`
- Card / table / KPI radius **0–4px**
- **No box-shadow** on cards, tables, or KPI cells
- Side sheets only: `0 4px 16px rgba(26,29,35,0.08)`
- Buttons and inputs: 1px border, 0–4px radius, no elevation
- Empty states: centered title + muted copy, no illustration

## StatusPill (quiet) — text labels required

Every status is a chip: faint/near-mono background + a small **semantic** dot + a **text label** (never color-only). Implemented in `src/components/badges.tsx`.

Backgrounds stay close to `#F5F5F5` (or a faint tint). Text hexes remain the semantic labels below.

| Status | Background | Text | Label |
| --- | --- | --- | --- |
| draft | `#F5F5F5` | `#737373` | Draft |
| submitted | `#F3F7F5` | `#0B6E4F` | Submitted |
| confirmed | `#F5F7FA` | `#175CD3` | Confirmed |
| invoiced | `#F5F6FA` | `#3538CD` | Invoiced |
| out_for_delivery | `#FAF8F4` | `#B54708` | Out for delivery |
| delivered | `#F3F7F5` | `#067647` | Delivered |
| settled | `#F3F7F5` | `#067647` | Settled |
| cancelled | `#F7F5F5` | `#B42318` | Cancelled |
| return logged | `#F7F5F3` | `#C45C26` | Return logged |
| unpaid | `#F5F5F5` | `#737373` | Unpaid |
| partial | `#FAF8F4` | `#B54708` | Partial |
| paid | `#F3F7F5` | `#067647` | Paid |

## Money

All monetary values render via `<Money>` as `Rs 12,450` (grouped thousands).

- Default: mono + tabular — tables, rails, line items
- `variant="hero"`: Georgia — KPI values, Balance due, Review Total
