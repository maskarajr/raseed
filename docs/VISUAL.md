# Raseed — Visual Reference

Authoritative design values. Future passes MUST snap to these exactly; do not invent hexes.

## Design tokens

| Token | Hex |
| --- | --- |
| `--bg` | `#F4F5F7` |
| `--surface` | `#FFFFFF` |
| `--border` | `#E2E5EA` |
| `--text` | `#1A1D23` |
| `--text-muted` | `#5C6570` |
| `--primary` | `#0B6E4F` |
| `--primary-hover` | `#095A41` |
| `--primary-soft` | `#E6F4EF` |
| `--accent` | `#C45C26` |
| `--danger` | `#B42318` |
| `--warning` | `#B54708` |
| `--success` | `#067647` |

Font: `"Segoe UI", system-ui, sans-serif`. Body 14px. No gradients, glass, dark mode, or illustrations.

## StatusPill (background / text) — exact pairs

Every status renders as a chip: colored background + a small dot + a **text label** (never color-only). Implemented in `src/components/badges.tsx`.

| Status | Background | Text | Label |
| --- | --- | --- | --- |
| draft | `#EEF0F3` | `#5C6570` | Draft |
| submitted | `#E6F4EF` | `#0B6E4F` | Submitted |
| confirmed | `#E8F1FB` | `#175CD3` | Confirmed |
| invoiced | `#EEF4FF` | `#3538CD` | Invoiced |
| out_for_delivery | `#FFFAEB` | `#B54708` | Out for delivery |
| delivered | `#E6F4EF` | `#067647` | Delivered |
| settled | `#E6F4EF` | `#067647` | Settled |
| cancelled | `#FEE4E2` | `#B42318` | Cancelled |
| return logged | `#FEF6EE` | `#C45C26` | Return logged |

## Money

All monetary values render via the single `<Money>` helper as `Rs 12,450` (grouped thousands) with `font-variant-numeric: tabular-nums`. Never raw number strings.
