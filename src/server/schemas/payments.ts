import { z } from "zod";
import { PAYMENT_MODES } from "@/lib/enums";

export const createPaymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().int().positive(),
  mode: z.enum(PAYMENT_MODES),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
