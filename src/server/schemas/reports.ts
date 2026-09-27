import { z } from "zod";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

export const salesReportQuerySchema = z.object({
  from: dateString.optional(),
  to: dateString.optional(),
  // "7d" adds the zero-filled booked/collected series for the dashboard hero
  // sparkline. Kept as an explicit opt-in so the default report payload (and
  // its cost) is unchanged for existing callers.
  range: z.enum(["7d"]).optional(),
});

export type SalesReportQuery = z.infer<typeof salesReportQuerySchema>;
