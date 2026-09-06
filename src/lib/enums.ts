// Central definitions for enum-like string fields.
// SQLite (via Prisma) cannot use native enums, so the allowed value sets live
// here and are enforced through Zod + these TypeScript unions.

export const ROLES = ["owner", "office", "booker"] as const;
export type Role = (typeof ROLES)[number];

export const STOCK_REASONS = [
  "purchase",
  "adjustment",
  "sale",
  "return",
  "correction",
] as const;
export type StockReason = (typeof STOCK_REASONS)[number];

export const ORDER_STATUSES = [
  "draft",
  "submitted",
  "confirmed",
  "invoiced",
  "out_for_delivery",
  "delivered",
  "settled",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["unpaid", "partial", "paid"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_MODES = ["cash", "credit"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

// Allowed order status transitions (server-enforced lifecycle).
// draft -> submitted -> confirmed -> invoiced -> out_for_delivery ->
// delivered -> settled ; almost any active state -> cancelled.
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["confirmed", "cancelled"],
  confirmed: ["invoiced", "cancelled"],
  invoiced: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: ["settled", "cancelled"],
  settled: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}
