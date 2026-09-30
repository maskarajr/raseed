import { z } from "zod";
import { ORDER_STATUSES } from "@/lib/enums";

export const orderItemSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().int().positive(),
  unitPrice: z.number().int().nonnegative(),
});

export const createOrderSchema = z.object({
  customerId: z.string().min(1),
  // Only used/allowed when office creates on behalf of a booker.
  bookerId: z.string().min(1).optional(),
  notes: z.string().max(500).optional(),
  items: z.array(orderItemSchema).min(1),
  // Cash advance taken at capture (G1). Whole PKR, >= 0. Upper bound is the
  // order subtotal, validated in the service once the subtotal is summed
  // server-side (never trust a client-supplied total).
  advance: z.number().int().min(0).default(0),
  submit: z.boolean().default(false),
});

// Draft-only edit (Privy seq211): replace items / notes / advance while the
// order is still a draft. Nothing else mutates through this endpoint. Server
// recomputes subtotal from items and re-clamps advance (see editDraftOrder).
export const editDraftOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1),
  notes: z.string().max(500).optional(),
  advance: z.number().int().min(0).optional(),
});

// Statuses reachable via the generic status endpoint (office advancing an
// invoiced order through delivery). `settled` is intentionally excluded — it is
// balance-driven (reached only when the invoice balance hits 0 via payment),
// not a manual transition. draft/submitted/confirmed/invoiced/cancelled have
// dedicated endpoints or are set implicitly.
export const advanceStatusSchema = z.object({
  status: z.enum(["out_for_delivery", "delivered"]),
});

export const listOrdersQuerySchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
});

// Batch confirm/invoice (owner seq18). The client sends the EXACT ids of the
// filter population it is acting on — the server never re-derives a filter, so
// a stale list can only fail per id (see `batchOrderAction`), never widen.
// Bound is a batch cap, not pagination: >200 ids is rejected so one click
// cannot turn into an unbounded transaction storm.
export const BATCH_ORDER_MAX_IDS = 200;

export const batchOrderActionSchema = z.object({
  action: z.enum(["confirm", "invoice"]),
  ids: z
    .array(z.string().min(1))
    .min(1)
    .max(BATCH_ORDER_MAX_IDS),
});

export type BatchOrderApiInput = z.infer<typeof batchOrderActionSchema>;

export type CreateOrderApiInput = z.infer<typeof createOrderSchema>;
