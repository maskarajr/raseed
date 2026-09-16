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
  submit: z.boolean().default(false),
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

export type CreateOrderApiInput = z.infer<typeof createOrderSchema>;
