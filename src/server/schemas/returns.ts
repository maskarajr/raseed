import { z } from "zod";

export const createReturnSchema = z.object({
  invoiceId: z.string().min(1),
  productId: z.string().min(1),
  qty: z.number().int().positive(),
});

export type CreateReturnInput = z.infer<typeof createReturnSchema>;
