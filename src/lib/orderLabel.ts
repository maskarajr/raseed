import { statusUi, type PillTone } from "./status";

/**
 * ONE derived order label for every surface (booker list/detail, office
 * list/detail) — Figmi booker-order-detail.md §4/§5, Spec E §9 (owner chose
 * REMOVE, seq474): the old virtual `confirmed | out_for_delivery` band word
 * was deleted. A pill word must be checkable on the screen that shows it,
 * and this product has no delivery date to check against — so those statuses
 * now fall through to the persisted lifecycle words.
 *
 * Precedence is explicit so a row never reads two ways:
 * Collected (money in full) > To collect (invoice exists with balance > 0) >
 * raw lifecycle status (statusUi). Money words are booker-side only; the
 * office list renders statusUi 1:1 with the enum.
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
  return statusUi(o.status);
}
