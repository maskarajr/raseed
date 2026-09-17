import { z } from "zod";
import { COLLECT_PAYMENT_KINDS, PAYMENT_MODES } from "@/lib/enums";

export const createPaymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().int().positive(),
  mode: z.enum(PAYMENT_MODES),
  kind: z.enum(COLLECT_PAYMENT_KINDS).optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
