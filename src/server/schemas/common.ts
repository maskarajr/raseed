import { z } from "zod";

export const idSchema = z.string().min(1);

// Coerce query-string numbers safely.
export const intQuery = z
  .string()
  .regex(/^\d+$/)
  .transform((s) => parseInt(s, 10));

export const optionalIntQuery = intQuery.optional();
