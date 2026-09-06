import { z } from "zod";

export const generateInvoiceSchema = z.object({
  orderId: z.string().min(1),
});

export type GenerateInvoiceInput = z.infer<typeof generateInvoiceSchema>;
