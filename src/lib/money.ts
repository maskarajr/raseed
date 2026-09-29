// All money values are integer PKR (whole rupees).
// Rendered as `Rs 12,450` with grouped thousands.

const GROUPED = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function formatPKR(amount: number): string {
  return `Rs ${GROUPED.format(amount)}`;
}

/**
 * Spec E §9 rev 1.1 (Figmi seq444, money-truth finding; Privy seq447 P-1):
 * ONE formula set for the money words, consumed by every surface. A draft is
 * work, never a rupee — money sums exclude draft and cancelled orders. The
 * old per-page math (`collected = booked − toCollect` over an UNFILTERED
 * array) counted a draft's subtotal as cash-in (Bilal's ORD-00009, Rs 5,280)
 * and swept every not-yet-invoiced rupee into 'Collected' as residual too
 * (demo probe: strip claimed Rs 186,340 cash; provable paid-cash is
 * Rs 145,930). `collectedSum` is paid cash, never a residual.
 */

export type MoneyOrder = {
  status: string;
  subtotal: number;
  invoice: {
    paymentStatus?: string;
    balance?: number | null;
    amountPaid?: number | null;
  } | null;
};

/** Orders that carry money truth: drafts and cancelled records never do. */
export function openOrders<T extends MoneyOrder>(orders: T[]): T[] {
  return orders.filter((o) => o.status !== "draft" && o.status !== "cancelled");
}

/** Σ subtotal over open orders — the 'Booked' axis. */
export function bookedSum<T extends MoneyOrder>(orders: T[]): number {
  return openOrders(orders).reduce((s, o) => s + o.subtotal, 0);
}

/** Σ outstanding invoice balance (balance > 0 only) — the 'To collect' axis. */
export function toCollectSum<T extends MoneyOrder>(orders: T[]): number {
  return openOrders(orders).reduce(
    (s, o) => s + Math.max(0, o.invoice?.balance ?? 0),
    0,
  );
}

/**
 * Σ cash actually paid against each order, capped at its subtotal — the
 * 'Collected' axis. invoice.amountPaid is seeded from order.advance at
 * invoicing and grows with settles (partial-capable), so this is paid cash,
 * not booked-minus-outstanding.
 */
export function collectedSum<T extends MoneyOrder>(orders: T[]): number {
  return openOrders(orders).reduce(
    (s, o) => s + Math.min(o.subtotal, o.invoice?.amountPaid ?? 0),
    0,
  );
}
