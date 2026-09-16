# Raseed — component contract

The components below are the whole vocabulary. If a screen needs something that is not
here, compose these — do not invent a new visual primitive. Classes refer to `raseed.css`;
each component lists the reference frame in `../raseed-ops-board.html` where you can see
it rendered.

Everything is token-driven. No component may hard-code a colour.

---

## StatusPill

The only way to show status. A pill is a matched foreground/background pair from the five
tones, plus a 5px dot in `currentColor`. Never a coloured table row, never coloured body
text, never a bare coloured dot, never a new tone.

```
tone: 'ok' | 'info' | 'warn' | 'bad' | 'neu'
```

```
<span class="status s-warn">To collect</span>
```

| Tone | fg | bg | Contrast | Labels |
|---|---|---|---|---|
| `ok` | `--ok-fg` | `--ok-bg` | 8.61 | Paid · Confirmed · In stock · Collected · Delivered · Up to date · On track · Active |
| `info` | `--info-fg` | `--info-bg` | 8.15 | Scheduled |
| `warn` | `--warn-fg` | `--warn-bg` | 7.60 | To collect · Awaiting confirm · Low |
| `bad` | `--bad-fg` | `--bad-bg` | 8.35 | Cancelled · Out |
| `neu` | `--neu-fg` | `--neu-bg` | 6.85 | Draft · Inactive · Not shipped |

**One label, one tone, both surfaces.** The booker PWA and the office must render the same
word with the same tone. Outstanding money is always `To collect` (`warn`); `bad` is
reserved for terminal-negative states.

**Inject the tone, don't guess it.** Keep the label→tone map in `tailwind-theme.js`
(`labelTone`) as the single lookup so the API cannot drift.

Reference: `frame-office-invoices` (list), `frame-office-order-detail` (within a header row).

---

## Money

Numbers are a component, not a string.

```
<Money value={12450} />
/* renders: Rs 12,450 */
```

Rules: `Rs` + space + thousands-separated integer, mono, `font-variant-numeric:tabular-nums`,
right-aligned when in a column. No decimals unless the paisa is real. Never abbreviate
(`Rs 1.2M` is wrong — write `Rs 1,240,500`). Use `Intl.NumberFormat('en-PK')`.

```
<td class="money">Rs 12,450</td>
```

Reference: any table column, `.totals`, `.pbig`.

---

## Button

One primary action, one green. Everything else is secondary, ghost, or a text link.

| Variant | Class | Use |
|---|---|---|
| Primary | `.btn-primary` | The single green action in a viewport |
| Secondary | `.btn-sec` | Neutral bordered action (Print, Log return, Cancel) |
| Ghost | `.btn-ghost` | Low-emphasis / icon-only, sits in card headers and bars |
| Small | `.btn-sm` | Compact height, used with ghost/secondary |
| Block | `.btn-block` | Full-width, PWA flows and form footers |

States: default · hover (`--accent` darkened to 88% for primary; border or `--fg-soft` fill
for the others) · disabled (`.45` opacity, `cursor:not-allowed`, primary only) ·
focus-visible (accent ring from `raseed.css`).

**Accent budget.** At most **two** green marks visible per screen: the brand mark plus one
primary button. If a screen would show a second green button inside the same viewport,
demote it to `.btn-sec`. Overlays dim the base frame behind a scrim, so the base screen's
green does not compete with the sheet's — but base `Record payment` must be a secondary
inside the detail header for the rest of the screen to stay inside budget when no overlay
is open.

Reference: `frame-office-orders` (single primary), `frame-office-invoice-detail` (secondary trio).

---

## FilterChipBar

Single-select status/category filter. Chips wrap, one is on, the on-chip is `--fg` (never
green).

```
<div class="chips">
  <button class="chip is-on" data-f="">All</button>
  <button class="chip" data-f="to collect">To collect</button>
  <button class="chip" data-f="paid">Paid</button>
</div>
```

Semantics:
- **Only chips carrying `data-f` filter.** Chips without `data-f` (option chips inside the
  payment sheet) merely toggle their own state. Do not attach the filter handler to every
  `.chip`.
- The reset chip has `data-f=""`; an empty value means "no chip constraint", not "match the
  label `All`". Treating it as a term is a known bug.
- A chip term matches when it appears as a substring of the row's text content. Keep
  vocabularies disjoint so terms cannot collide (`Paid` vs `Unpaid` was a real collision —
  hence `To collect`, not `Unpaid`).
- The bar drives `.tbl tbody tr`; for card lists (booker orders) it drives `[data-row]`.
- Always render the empty state (`.tbl-empty`) and update the `[data-count]` counter.

Reference: `frame-office-orders`, `frame-office-invoices`, `frame-booker-orders`.

---

## SegmentedControl

Range/scope switch (Today / Week / Month, Outstanding / Paid).

```
<div class="seg">
  <button class="seg-item is-on">Today</button>
  <button class="seg-item">Week</button>
</div>
```

The active item is a raised white pill; the control is neutral. Never tint it green.

Reference: `frame-office-reports`, `frame-office-orders`.

---

## ToggleSwitch

On/off setting. Track is `--fg` when on (not green), `--neu-bg` when off.

```
<button class="switch is-on" role="switch" aria-checked="true"></button>
```

Always set `aria-checked`. A disabled switch is `.switch` with `aria-disabled="true"` and is
not toggled.

Reference: `frame-office-settings` (Roles, Business).

---

## Inputs

| Element | Class | Notes |
|---|---|---|
| Text input | `.linput` | Login and form fields; full width; label above in 12px `--muted` |
| Search | `.search` | 260px, sits in the list card header; `data-filter` drives the frame filter |
| Field wrapper | `.lfield` | `display:flex;flex-direction:column;gap:6px` with a `<label>` |

The search input is the live filter term; it ANDs with the active chip.

Reference: `frame-login`, `frame-office-orders`.

---

## DataTable

```
<div class="tbl-wrap">
  <table class="tbl tight"> … </table>
</div>
```

Rules:
- `th` is mono, 10px, uppercase, `--muted`, left-aligned, with a bottom border.
- Cells are `white-space:nowrap` — **never** re-enable wrapping to make a column fit.
- Numeric columns get `.money` (or `.num` + `.r`); they align right.
- Row hover is `--fg-soft`. There is no zebra striping and no "submitted" row highlight —
  status is the pill only.
- If the table shares its row with a rail (Stock), it **must** sit in `.tbl-wrap` and use
  `.tbl.tight`. Without the wrapper a nowrap table paints under the adjacent card.
- Empty state: `.tbl-empty` in a full-width cell; toggle its `hidden` with the row count.

Reference: `frame-office-orders`, `frame-office-stock` (the constrained case).

---

## KpiCard

```
<div class="kpi">
  <p class="klab">Booked today</p>
  <p class="kval num">Rs 512,300</p>
  <p class="kdelta">38 orders · +6 vs yesterday</p>
</div>
```

Four per row (`.kpis`). Label 12px muted, value in the display face (this is the board's one
typographic flourish), delta in mono 11px. Values are `Money` or plain counts.

Reference: `frame-office-dashboard`, `frame-office-reports`.

---

## Card and CardHeader

```
<div class="card2">
  <div class="card2-h"><h4 class="h3s">Orders awaiting confirmation</h4><button class="btn-ghost btn-sm">View all</button></div>
  …
</div>
```

Card title uses the display face (`.h3s`). Card header actions are ghost buttons only — a
card never contains a green primary unless the card is the screen's single action.

A `.card2.grow` that is a direct child of `.content` gets `flex:1 0 auto`, so the card
grows to fit rather than being squeezed below its content.

Reference: `frame-office-dashboard`.

---

## AppShell — Office

```
<div class="rail">
  <div class="rbrand"><span class="rmark">R</span>Raseed</div>
  <nav class="rnav">
    <p class="rgroup">Overview</p>
    <button class="ritem is-on">…Dashboard</button>
    …
    <p class="rgroup">Store</p>
    …
  </nav>
  <div class="rfoot"> …Bookers · Stock · Settings… </div>
</div>
<div class="main">
  <header class="appbar">…</header>
  <div class="content">…</div>
</div>
```

- Rail groups are exactly **Overview** (Dashboard, Reports) and **Store** (Orders, Invoices,
  Products, Customers).
- **Bookers, Stock, Settings are pages that live in `.rfoot`, not in the primary rail.** Do
  not promote them into a group.
- The active item is `.ritem.is-on` — an `--fg` fill with `--surface` text. Never green.
- `.rmark` is the brand mark and is one of the two permitted green marks.
- `.content` is the scroll container (`overflow-y:auto; overflow-x:hidden`).

Reference: every `frame-office-*`.

---

## PageHeader (appbar)

```
<header class="appbar">
  <div><h3 class="ptitle">Invoices</h3><p class="psub">Rs 1,240,500 outstanding · Rs 50,000 collected on route today</p></div>
  <div class="acts">…at most one .btn-primary…</div>
</header>
```

Title in the display face, subtitle 12px muted, actions right-aligned. On a detail route the
title is the record id with its StatusPill beside it, and the subtitle becomes a breadcrumb
(`Invoices / INV-2291`).

Reference: all office frames.

---

## Person / Avatar

```
<div class="person"><span class="avatar">ST</span><span><span class="pname">Shaheen Traders</span><span class="pmeta">Route 5</span></span></div>
```

Initials in a neutral `--fg-soft` disc. Not coloured, not green.

Reference: `frame-office-order-detail`, `frame-office-bookers`.

---

## DefinitionList

Label-over-value pairs for record metadata (billed to, issued, collection, received,
balance). Labels are mono 11px uppercase; keep the tracking at `0.08em`.

The invoice detail uses a **3-column** grid for its `dl`; other uses may auto-fit.

Reference: `frame-office-invoice-detail`.

---

## Timeline

Order lifecycle. Dots are neutral; a completed dot is `.tl-dot.done` (an `--fg` fill) — never
green.

```
<div class="tl-item"><span class="tl-dot done"></span><div>…</div></div>
```

Reference: `frame-office-order-detail`.

---

## TotalsBlock

Right-aligned stack: subtotal, freight, discount, then `.trow.grand` for the total with a
top rule in `--fg`.

```
<div class="totals">
  <div class="trow"><span>Subtotal</span><span class="num">Rs 42,100</span></div>
  <div class="trow grand"><span>Total</span><span class="num">Rs 42,800</span></div>
</div>
```

Keep money right-aligned and reconcile it: every total shown must equal the sum of the rows
above it. Freight was adjusted once so the detail matched its own list row — check this
whenever you touch amounts.

Reference: `frame-office-invoice-detail`, `frame-office-capture` (review step).

---

## Warnbox

Inline soft warning (soft stock warning, held stock, balance flag). Uses the `warn` pair.

```
<div class="warnbox"><svg class="ic ic-sm" …>…</svg><span>Only 4 crates left on hand.</span></div>
```

This is the only place a tone pair renders as a block; it is not a substitute for a pill.

Reference: `frame-booker-capture`.

---

## Overlays

Three shapes, one behaviour (open → scrim dims the base → close on scrim or close button):

| Shape | Class | Surface | Use |
|---|---|---|---|
| Bottom sheet | `.sheet` | Booker PWA | Capture confirmations, quick actions |
| Modal sheet | `.sheet-d` | Office desktop | Record payment, Log return — centred raised panel |
| Drawer | `.drawer` | Office desktop | New product, Product details — right side, 400px |

```
<div class="scrim is-open"></div>
<section class="sheet-d is-open" id="sheet-payment">
  <div class="sheet-h"><h4 class="h3s">Record payment · INV-2289</h4><button class="btn-ghost btn-sm" data-close>…</button></div>
  …
</section>
```

- The scrim is shared by all overlays in a frame; opening one opens the scrim.
- Closing releases the scrim and blurs/removes focus from the sheet.
- An open overlay dims the base appbar, so the sheet owns the only green on screen.
- Sheets must trap focus and restore it to the trigger on close (production requirement —
  the prototype did not implement a focus trap).

Reference: `frame-overlay-payment`, `frame-overlay-return`, `frame-overlay-new-product`,
and the inline `#sheet-payment` / `#sheet-return` in `frame-office-invoice-detail`.

---

## CaptureWizard

Three steps, driven by props/state rather than DOM toggling in the real app.

```
Step 1 · Pick the shop   → searchable list of the booker's customers
Step 2 · Add products    → qty steppers, soft stock warning, running line total
Step 3 · Advance and submit → review with the large total, advance/collect rows
```

- Progress: three `.wiz-dot` segments; current is `--fg`, done is a 45% `--fg` tint, upcoming
  is `--border`. Never green.
- `QtyStepper` (`.qty-ctl`): ± buttons around a mono value; a zero row gets `.qty-row.is-zero`
  (50% opacity). Stock is a **soft** warning — it never blocks the add.
- The primary submit is disabled until at least one line has quantity > 0.
- Review math: `total = Σ(qty × price)`; `advance = min(10,000, total)`;
  `balance = total − advance`. The advance is a suggestion the booker can raise or lower; it
  is cash, never a credit facility.
- Copy: step 3 is "Advance and submit". Never "Payment plan", "Installment", or "Credit".

Reference: `frame-booker-capture`.

---

## Toast

Transient confirmation, bottom-centre, `--fg` pill with `--surface` text, 2.2s, one at a
time (a new toast replaces the current message).

Use it for: sheet submissions, toggles, print, redirects. Do not use it for validation —
validation is inline on the field.

Reference: any action in the board.

---

## PrintDocument

`/office/invoices/[id]/print` is a print-only document, not an app screen.

- `.doc` is a white A4-ish sheet: header rule, billed-to / booker / collection block, line
  items table, totals, then a footer note.
- The on-screen action calls `window.print()`; there is no separate print stylesheet
  dependency in the app — the route itself is the printable artefact.
- In the board, only this frame is printable (`.fcard.is-printable`). In the app, drop the
  app chrome for this route and print `.doc`.

Reference: `frame-office-print`.

---

## Universal states

Every interactive element must define and verify these as a foreground/background pair.
Contrast must never drop below the default state (4.5:1 normal text, 3:1 large text/icons).

| State | Rule |
|---|---|
| hover | Move `--fg-soft` / darken `--accent`; never lighten text toward `--muted` |
| focus-visible | 2px `--accent` outline at 2px offset (`raseed.css` production block) |
| active/selected | `--fg` fill or `--fg` inset ring; never green |
| disabled | Only state allowed to reduce contrast (`.45` opacity on primary) |

Tables, nav, chips and segmented controls use `--fg` tints for their selected state so that
green keeps exactly one meaning: this is the thing to do.
