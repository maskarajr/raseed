import { statusUi, type PillTone } from "./status";

/**
 * ONE derived order label for every surface (booker list/detail, office
 * list/detail) — Figmi booker-order-detail.md §4/§5, frozen by Privy seq211:
 *
 *   Scheduled = confirmed | out_for_delivery (awaiting collection;
 *   not Collected, not Draft).
 *
 * Precedence is explicit so a row never reads two ways:
 * Collected (money in full) > To collect (invoice exists with balance > 0) >
 * Scheduled (confirmed band) > raw lifecycle status.
 * Scheduled stays a virtual label — no persisted status, no new enum.
 */
export type LabelableOrder = {
  status: string;
  invoice?: { paymentStatus?: string; balance?: number } | null;
};

export function orderLabel(o: LabelableOrder): { label: string; tone: PillTone } {
  if (o.status === "cancelled") return { label: "Cancelled", tone: "bad" };
  const inv = o.invoice ?? null;
  const paidOff =
    o.status === "settled" ||
    inv?.paymentStatus === "paid" ||
    (inv != null && (inv.balance ?? 1) <= 0);
  if (paidOff) return { label: "Collected", tone: "ok" };
  if (inv && (inv.balance ?? 0) > 0) return { label: "To collect", tone: "warn" };
  if (o.status === "confirmed" || o.status === "out_for_delivery")
    return { label: "Scheduled", tone: "ok" };
  return statusUi(o.status);
}

/** Scheduled-band test for filters/metrics (drafts and collected never match). */
export function isScheduledBand(o: LabelableOrder): boolean {
  return orderLabel(o).label === "Scheduled";
}
