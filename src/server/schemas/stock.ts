import { z } from "zod";
import { STOCK_REASONS } from "@/lib/enums";

// Manual office stock movement. Restricted to non-sale/return reasons; sale
// and return movements only happen via invoicing/returns services.
export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1),
  delta: z.number().int().refine((v) => v !== 0, "delta must be non-zero"),
  reason: z.enum(
    STOCK_REASONS.filter((r) => r !== "sale" && r !== "return") as [
      string,
      ...string[],
    ],
  ),
});

export const ledgerQuerySchema = z.object({
  productId: z.string().optional(),
});

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
