# Raseed — brand spec (derived)

Source: `docs/VISUAL.md` (locked tokens, quoted in brief) + the two Mobbin reference frames
(`image.png` light invoice list, `image-1.png` dark commerce dashboard — structure only, not palette).

**One sentence:** a light, paper-calm operations surface where a single deep green carries every
primary action, warm orange is reserved for money that needs chasing, and all numerics are tabular
mono so a column of `Rs 512,300` reads as a column.

## Six tokens

| Token | Value | OKLch | Source |
|---|---|---|---|
| `--bg` | `#F4F5F7` | `oklch(0.970 0.003 264.5)` | locked (VISUAL.md) |
| `--surface` | `#FFFFFF` | `oklch(1.000 0.000 89.9)` | locked |
| `--fg` | `#14181C` | `oklch(0.207 0.010 248.3)` | derived — canvas hue, lifted off pure black |
| `--muted` | `#626C76` | `oklch(0.526 0.020 248.2)` | derived |
| `--border` | `#E1E5EA` | `oklch(0.920 0.008 253.9)` | derived |
| `--accent` | `#0B6E4F` | `oklch(0.478 0.098 164.9)` | locked — the **primary** action green |

Brand secondary: `--warm #C45C26` → `oklch(0.595 0.148 44.9)` (locked). Never a white-text button
fill (4.28:1 — fails AA for 15px). Used only as a graphic fill and via its dark pill text.

## StatusPill pairs only

Foreground/background pairs are shipped as a matched set; no other status colouring is allowed.

| Tone | fg | bg | Contrast |
|---|---|---|---|
| `ok` (Paid, Confirmed, In stock) | `#0A4C37` | `#E4F1EC` | 8.61 |
| `info` (Scheduled, Invoiced) | `#14486F` | `#E3EEF6` | 8.15 |
| `warn` (To collect, Awaiting confirm, Low) | `#7A3512` | `#FBE9DF` | 7.60 |
| `bad` (Cancelled, Out of stock) | `#7A1F1F` | `#F7E3E3` | 8.35 |
| `neu` (Draft, Inactive) | `#49525A` | `#ECEEF1` | 6.85 |

Body text `--fg` on `--surface` 17.84:1 · `--muted` on `--surface` 5.35:1 · white on `--accent` 6.25:1.

## Type

```
--font-display: 'Iowan Old Style', 'Charter', Georgia, 'Times New Roman', serif;
--font-body:    -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
--font-mono:    ui-monospace, 'JetBrains Mono', 'SF Mono', Menlo, monospace;
```

Display carries screen titles and KPI values (the one flourish). Body carries all interface text.
Mono carries every number, ID, date and route — tabular, never proportional.

## Operating model (locked by the product owner)

1. **The booker owns the loop, not just the order.** Route visit → capture order → after the office
   invoices, **deliver and collect the cash**. Collection is the booker's measure, so every booker
   screen shows collected-vs-booked, and a shop that owes money is flagged before a new order is taken.
2. **Money in is collect-on-invoice (part or full) — never credit, never cash advance.** No
   installments, no credit terms, no due dates, no credit limits. An invoice carries two
   numbers only: **collected to date** and **balance due**. Copy that implies a payment
   timeline or an advance at order submit is a defect.
3. **Fulfilment follows the invoice.** Office confirms → invoices → booker delivers → cash collected.
   Returned goods restock the godown and reduce the balance.

## Observed rules

1. **Money is a component, not a string.** Always `Rs 12,450` — mono, tabular, thousands-separated,
   no decimals unless the paisa is real.
2. **Status is a pill, never a coloured row or coloured text.** Five pairs above; a status that has no
   pair does not get invented. One label maps to exactly one tone across both surfaces — the booker
   PWA and the office read the same word the same way. Outstanding money has a single wording,
   `To collect` (`warn`), on every surface that shows payment state; `bad` is reserved for
   `Cancelled` and `Out of stock`. Where a column already carries the money (`Outstanding`), the
   status column keeps the account state (`Active` / `Inactive`) instead of repeating it.
3. **Green appears at most twice per screen — the brand mark plus one primary action.** Active nav,
   active filters, selected option cards, wizard progress dots, toggles and charts all use `--fg`
   tints, so green keeps meaning "this is the thing to do". Overlays dim the base frame behind a
   scrim, so the covered screen's green never competes with the sheet's.
4. **Chrome is neutral on light canvas.** Rails, top bars and tables sit on `--surface`; the working
   area sits on `--bg`. The approved board is light only; the app may opt into the dark set below,
   which inverts the same two planes rather than introducing a third.
5. **Numbers align right, labels align left, and nothing wraps inside a cell.**

## Dark theme (opt-in)

`handoff/raseed.css` carries a second token block, `[data-theme="dark"]` on `<html>` or `<body>`.
It is scoped to `@media screen`, so **print always resolves to the light set** and the invoice and
print route keep their paper appearance on either theme. No component rule changes with the theme.

Values are derived in OKLch from the light anchors — fg/muted/border keep the 248 canvas hue, green
keeps 165, warm keeps 45 — so the dark theme is the same brand, not a second one.

| Token | Value | OKLch |
|---|---|---|
| `--bg` | `#101419` | `oklch(0.190 0.012 248)` |
| `--surface` | `#1C2125` | `oklch(0.243 0.011 248)` |
| `--fg` | `#EEF0F3` | `oklch(0.955 0.004 248)` |
| `--muted` | `#9FA7B0` | `oklch(0.725 0.016 248)` |
| `--border` | `#3C4248` | `oklch(0.375 0.013 248)` |
| `--accent` | `#56D1A3` | `oklch(0.780 0.130 165)` |
| `--on-accent` | `#0B1E16` | `oklch(0.215 0.030 165)` |
| `--warm` | `#EB8656` | `oklch(0.720 0.140 45)` |
| `--knob` (switch) | `#81878D` | `oklch(0.620 0.012 248)` |

**The accent inverts its own label.** On light canvas the green is deep enough for white text; on
dark canvas it has to be luminous to read, so ink on it is a deep green (`--on-accent`, 9.17:1)
instead of white. That is why `raseed.css` extracted `--on-accent`, `--accent-hover`, `--scrim` and
`--knob` into tokens — dark mode cannot be reached by swapping the six locked values alone. The
modal scrim is the clearest failure: it is `--fg` at 42%, which becomes a **white** scrim on dark.

StatusPill pairs get dark variants that stay a matched set, same five tones:

| Tone | fg | bg | Contrast |
|---|---|---|---|
| `ok` | `#8EE5BF` | `#153528` | 8.95 |
| `info` | `#ACD4FC` | `#1D3041` | 8.79 |
| `warn` | `#FFC597` | `#442916` | 8.70 |
| `bad` | `#FEB9B8` | `#462626` | 8.24 |
| `neu` | `#C2C8CE` | `#292E34` | 8.07 |

Verified pairs: `--fg` on `--surface` 14.30 · on `--bg` 16.19 · `--muted` on `--surface` 6.71 ·
`--accent` on `--bg` 9.75 · `--on-accent` on `--accent` 9.17 · switch knob 3.75 off / 3.19 on ·
`--border` on `--surface` 1.60 (a hairline by intent, deliberately one step stronger than the light
theme's 1.25 so card and cell edges survive on a dark plane). Hover travels **lighter** on dark
(`--accent-hover`, L +0.06), never darker as it does on light.

## Open flag — PR #8

PR #8 proposes a **dark A/B on office chrome**. It is deliberately **not** rendered on the approved
board: dark chrome would fork `--bg`/`--surface` per frame and make the same screen reviewable
against two palettes. The board and `docs/VISUAL.md` remain light.

PR #8 is now resolved at the token layer rather than the board layer — the `Dark theme (opt-in)` set
above is that A/B, expressed as tokens so it re-themes the whole component layer without forking it.
Two things still need a human decision before ship:

1. `docs/VISUAL.md` should be amended with the dark canvas token, or the dark set stays an
   undocumented app-level opt-in.
2. The office and the booker surface should be switched **together**. A dark office with a light
   booker PWA is the one combination this token set cannot make coherent.
