import { z } from "zod";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

export const salesReportQuerySchema = z.object({
  from: dateString.optional(),
  to: dateString.optional(),
});

export type SalesReportQuery = z.infer<typeof salesReportQuerySchema>;
