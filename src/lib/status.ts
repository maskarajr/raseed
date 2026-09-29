export type PillTone = "ok" | "info" | "warn" | "bad" | "neu";

type StatusUi = { label: string; tone: PillTone };

/** DB / domain status → locked StatusPill copy + tone.
 * Office order surfaces render this map 1:1 with the persisted enum (R4:
 * one axis per surface). 'Settled' is the office terminal word — if the
 * owner flips it to 'Collected', change ONLY this constant. The money-axis
 * words (To collect/Collected) live in orderLabel.ts, booker side.
 * Spec E §9 gate 24 (owner REMOVE ratified, seq474): green is reserved for
 * money-in (Paid/Settled) and the physical fact Delivered — 'Confirmed' is
 * s-info, same "office has it" band as Invoiced/Out for delivery. */
const BY_KEY: Record<string, StatusUi> = {
  draft: { label: "Draft", tone: "neu" },
  submitted: { label: "Awaiting confirm", tone: "warn" },
  confirmed: { label: "Confirmed", tone: "info" },
  invoiced: { label: "Invoiced", tone: "info" },
  out_for_delivery: { label: "Out for delivery", tone: "info" },
  delivered: { label: "Delivered", tone: "ok" },
  settled: { label: "Settled", tone: "ok" },
  cancelled: { label: "Cancelled", tone: "bad" },
  unpaid: { label: "To collect", tone: "warn" },
  partial: { label: "To collect", tone: "warn" },
  paid: { label: "Paid", tone: "ok" },
  active: { label: "Active", tone: "ok" },
  inactive: { label: "Inactive", tone: "neu" },
  low: { label: "Low", tone: "warn" },
  out: { label: "Out", tone: "bad" },
  "in stock": { label: "In stock", tone: "ok" },
  "on track": { label: "On track", tone: "ok" },
  "not shipped": { label: "Not shipped", tone: "neu" },
};

export function statusUi(status: string): StatusUi {
  const key = status.trim().toLowerCase().replace(/_/g, " ");
  return (
    BY_KEY[status] ??
    BY_KEY[key] ??
    BY_KEY[status.toLowerCase()] ?? {
      label: status.replace(/_/g, " "),
      tone: "neu",
    }
  );
}

export function stockTone(qty: number, reorder: number | null): StatusUi {
  if (qty <= 0) return { label: "Out", tone: "bad" };
  if (reorder != null && qty <= reorder) return { label: "Low", tone: "warn" };
  return { label: "In stock", tone: "ok" };
}

/**
 * Payment METHOD word — closed four-state (Figmi seq265, locked by Privy
 * seq268). ONE derived helper feeding order-detail Payment chip, invoice
 * detail, invoice print and booker detail; no surface keeps an inline
 * ternary. Method words only — amounts are shown by the surrounding rows,
 * never restated here.
 * F3 (Figmi seq486/seq497, ratified; F5 clamp per Breevie seq490): the
 * signature reads the INVOICE table — (advance, total, amountPaid) — never
 * order figures, so no caller mixes tables. Balance is derived and clamped
 * here (max(0, total − amountPaid)); the surplus is never signed into it.
 * (Subtotal was already ignored by design; the locked matrix doesn't need
 * it: partial-advance-then-collected hits 'Paid — advance' via advance > 0
 * && balance == 0.)
 */
export function methodLabel(
  advance: number,
  total: number,
  amountPaid: number,
): StatusUi {
  const balance = Math.max(0, total - amountPaid);
  if (balance <= 0)
    return advance > 0
      ? { label: "Paid — advance", tone: "ok" }
      : { label: "Paid", tone: "ok" };
  return advance > 0
    ? { label: "Advance taken", tone: "warn" }
    : { label: "Cash on delivery", tone: "neu" };
}
