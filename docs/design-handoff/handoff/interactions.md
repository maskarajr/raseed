# Raseed — interaction specs

How the approved board behaves, and how to carry that behaviour into the real app. The
board implements everything with one delegated click listener and a set of `data-*`
attributes; in the app these become named handlers and real state. The attribute names are
kept here as a Rosetta stone so you can diff your implementation against the prototype.

---

## 1. Board attribute -> production handler

| Board attribute | Behaviour | In the app |
|---|---|---|
| `data-toast="msg"` | Shows a transient confirmation | `toast(msg)` on the action's success |
| `data-open="#sheet-x"` | Opens an overlay + its scrim | `openOverlay('payment')` |
| `data-close`, `data-close-drawer` | Closes the containing overlay + scrim | `closeOverlay()` |
| `data-print` | `window.print()` | Print route / `window.print()` |
| `data-qty="inc" \| "dec"` | Stepper on the enclosing `.qty-row` | `setQty(lineId, n)` |
| `data-step="next" \| "back"` | Wizard step change | `setStep(i)` |
| `data-f="…"` | Filter term for the chip | `setFilter(term)` |
| `<input data-filter>` | Live search term | `setQuery(text)` |
| `data-row` | Filterable card (non-table list) | stable key on the card |
| `data-n` (on `.qty-val`) | Current quantity | state, not DOM |
| `data-price` (on `.qty-row`) | Unit price | from the product record |
| `data-total` / `data-items` | Running total / count | derived state |
| `data-rev-total/advance/balance` | Review-step figures | derived state |
| `data-submit` | Submit disabled while no line | derived `disabled` |
| `data-count` | Visible-row counter | derived count |
| `data-wizlabel` | `Step n of 3` | derived step label |
| `#rolehint` / `data-hint` | Role explanation under the login selector | conditional copy |

Rule: anything the board derives in the DOM (totals, counts, step labels, disabled states)
must be **derived state in the app**, never a second source of truth.

---

## 2. Navigation and role routing

- `/` redirects by role: owner -> `/office`, booker -> `/booker`. A signed-out visitor goes
  to `/login`.
- `/login` role selector chooses the post-auth destination. Owner resolves to the office
  dashboard; booker resolves to the PWA home.
- The two surfaces do not cross-link by role. A booker has no office routes; an owner does
  not land in the PWA.
- Preserve a booker's return-to path after login so a deep link like `/booker/orders/new`
  survives authentication.

---

## 3. Filtering

One filter model serves `Orders`, `Invoices`, `Products`, `Customers` and the booker's
`My orders`.

**Composition**
- The active chip (a `data-f` term) and the search input **AND** together.
- A chip with an empty `data-f` is the reset: it contributes no term. Never treat its label
  as a search term — doing so hides every row (a shipped bug).
- Chips are single-select within a bar.

**Matching**
- A row matches when the term is a substring of the row's text content (case-insensitive).
- Keep filter vocabularies disjoint. `Paid` and `Unpaid` collide as substrings, which is why
  the outstanding state is worded `To collect` and not `Unpaid`.
- Only chips with `data-f` filter. Option chips elsewhere (payment type, method) toggle
  themselves and must not touch the row list.

**Targets**
- Tables filter `.tbl tbody tr`.
- Card lists filter `[data-row]`. If a card list has no `data-row`, filtering silently does
  nothing — always key the cards.

**Feedback**
- Update the `[data-count]` in the subtitle.
- Show `.tbl-empty` when the visible count is zero; hide it otherwise.
- The filter is client-side and instant; do not debounce a local list.

---

## 4. Overlays (sheet, modal sheet, drawer)

```
open  -> overlay.is-open + scrim.is-open, base appbar dims
close -> overlay closes + scrim releases
```

- One scrim per frame/screen, shared by all overlays on it.
- Close paths: the close button, the `Cancel` button, and a click on the scrim.
- While a sheet is open the base screen is dimmed, which is how the accent budget survives:
  the sheet owns the only green mark on screen.
- On submit, close the sheet, then toast the result (the board toasts first, then closes in
  the same click). Keep the toast **after** the state update in the app.
- Production additions the prototype lacks: focus trap inside the overlay, focus return to
  the trigger on close, `Escape` to close, `aria-modal`, and `overflow:hidden` on the page
  behind the overlay.

---

## 5. Quantity and the capture wizard

**Stepper**
- `+` increments, `−` decrements to a floor of 0 (never negative).
- A zero line takes `.qty-row.is-zero` (50% opacity) but stays in the list.
- Every change recomputes the frame's totals.

**Totals (derived)**
```
total   = Σ(qty × price)
advance = min(10,000, total)     // a cash advance suggestion, editable
balance = total − advance
```
- The review step shows the large total, the advance, and the balance.
- Submit is disabled while `items == 0`.

**Steps**
```
step 0  Pick the shop       // searchable customers
step 1  Add products        // qty, soft stock warning, running total
step 2  Advance and submit  // review, advance + collect on delivery
```
- Progress dots: current `--fg`, done a 45% `--fg` tint, upcoming `--border`.
- The footer button reads `Continue` until the last step, then `Submit order`.
- Back preserves captured lines.
- **Stock is a soft warning.** It never blocks adding or submitting; show the `Warnbox` and
  let the office reconcile.

---

## 6. Toggles and selection states

| Control | Selected state | Never |
|---|---|---|
| `.chip` (filter) | `--fg` fill, `--surface` text | green |
| `.seg-item` | raised white pill | green |
| `.switch` | `--fg` track | green |
| `.opt` / `.role-opt` | `--fg` inset ring | green |
| `.ritem` (nav) | `--fg` fill | green |
| `.tl-dot.done` | `--fg` fill | green |
| `.ptab` (PWA nav) | `--fg` text, heavier icon stroke | green |
| `.wiz-dot` | `--fg` | green |

This is the accent-budget rule expressed as behaviour: **green means "this is the thing to
do"** and nothing else. Active navigation, filters, selections and progress are `--fg` tints.

---

## 7. Toast

- Bottom-centre, `--fg` pill, `--surface` text, 2.2s, one at a time (a new toast replaces the
  current message and resets its timer).
- Used for confirmations the user does not need to act on: sheet submissions, toggles,
  invites, print.
- Never used for validation. Validation is inline, on the field.
- Never used to report a navigation the user can see happening.

---

## 8. Print

- The print route `/office/invoices/[id]/print` renders the document only — no rail, no
  appbar, no actions.
- The `Print` button calls `window.print()`.
- The board also makes a single frame printable via a board-level `@media print` rule; that
  rule is **board scaffolding and must not be ported**. In the app the route is the printable
  artefact and the browser's own print stylesheet applies.
- Keep the document's totals reconciling with the invoice record. The grand-total line is
  labelled `To collect`.

---

## 9. Lifecycle and money rules (the product model)

**The loop**
```
booker visits shop -> captures order
office confirms    -> invoices
booker delivers    -> collects cash
```
The booker owns collection, not just the order. Every booker-facing screen reflects
booked vs collected.

**Orders** — `Draft -> Awaiting confirm -> Confirmed -> Invoiced`; `Cancelled` is terminal
and reachable before invoicing.

**Invoices** — two independent axes:
- fulfilment: issued/delivered
- payment: `To collect` -> `Paid` (or partially collected)
An invoice carries exactly two money figures: **collected to date** and **balance due**. The
UI labels the second `To collect`.

**Payments** — cash advance or partial. There is no installment plan, no credit term, no due
date, no credit limit. Valid payment types: `Part payment`, `Cash advance`, `Full settlement`.
Any copy that implies a payment schedule is a defect.

**Returns** — a per-line return reduces the balance and restocks the godown; it is logged
against the invoice and held for office approval.

**Status tone is not lifecycle inference.** Map a label to its tone through the `labelTone`
map; never colour by guessing the state's severity. `To collect` is always `warn`; `bad` is
only `Cancelled` and `Out`.

---

## 10. Accessibility and state requirements

These are required for ship; the click-through board does not implement them.

- Every focusable element shows a visible `:focus-visible` ring (`raseed.css`, production
  block: 2px `--accent`, 2px offset).
- Overlays trap focus, return focus to their trigger, and close on `Escape`.
- Toggle controls expose `role="switch"` and `aria-checked`; the filter chips expose
  `aria-pressed`; segmented controls expose a `tablist`/`radiogroup` pattern.
- Tables use real `<th scope>` headers; numeric columns keep their text right-aligned.
- Live regions: the toast is `aria-live="polite"`; the filter count updates announce politely.
- Motion respects `prefers-reduced-motion` (`raseed.css` disables transitions).
- Contrast never drops below the default on hover/focus/selected:
  text >= 4.5:1, large text and icons >= 3:1. Do not lighten a foreground toward `--muted` on
  hover; move the background or the border instead.

---

## 11. Verification checklist for the implementer

1. Every route in `screens.md` renders with the correct chrome for its surface.
2. `StatusPill` cannot render a tone outside the five; labels resolve through `labelTone`.
3. No raw hex outside the token layer; no gradients; no emoji as icons.
4. At most two green marks visible per screen, overlays included.
5. Filters: reset chip works, terms are disjoint, empty state and count track the result.
6. Capture wizard: submit disabled at zero items; totals/advance/balance derive correctly.
7. Overlays: scrim closes, focus is trapped and restored, base dims.
8. Print route has no chrome and its amounts reconcile with the invoice.
9. Keyboard pass over login, each list, each overlay, and the wizard.
10. No `Balance due` / credit / installment wording anywhere in the product copy.
