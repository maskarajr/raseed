import { Prisma } from "@/generated/prisma/client";

// Human-friendly sequential codes. Office usage is effectively single-writer
// during office hours, and the unique constraint on the column is the ultimate
// guard against the rare race.

export async function nextOrderCode(
  tx: Prisma.TransactionClient,
): Promise<string> {
  const n = await tx.order.count();
  return `ORD-${String(n + 1).padStart(5, "0")}`;
}

export async function nextInvoiceCode(
  tx: Prisma.TransactionClient,
): Promise<string> {
  const n = await tx.invoice.count();
  return `INV-${String(n + 1).padStart(5, "0")}`;
}
