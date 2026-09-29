import { Prisma } from "@/generated/prisma/client";

// Human-friendly sequential codes. The next value is derived from the MAXIMUM
// existing numeric suffix (max(code)+1), never from row count: deletes leave
// gaps in the sequence, and a count-based generator would re-mint a retired
// code and hit the unique constraint, hard-failing every subsequent create
// (the demo 500-on-submit bug). Codes are fixed-width zero-padded, so the
// parsed suffix is the only thing that matters. Office usage is effectively
// single-writer during office hours; the unique constraint remains the
// ultimate guard against the rare race.

function maxCodeSuffix(codes: string[], prefix: string): number {
  let max = 0;
  for (const code of codes) {
    if (!code.startsWith(prefix)) continue;
    const n = Number(code.slice(prefix.length));
    // Integer-only: "ORD-12abc" or "ORD-" are not sequence members.
    if (Number.isSafeInteger(n) && n > max) max = n;
  }
  return max;
}

function formatCode(prefix: string, seq: number): string {
  return `${prefix}${String(seq).padStart(5, "0")}`;
}

export async function nextOrderCode(
  tx: Prisma.TransactionClient,
): Promise<string> {
  const rows = await tx.order.findMany({ select: { code: true } });
  return formatCode("ORD-", maxCodeSuffix(rows.map((r) => r.code), "ORD-") + 1);
}

export async function nextInvoiceCode(
  tx: Prisma.TransactionClient,
): Promise<string> {
  const rows = await tx.invoice.findMany({ select: { code: true } });
  return formatCode("INV-", maxCodeSuffix(rows.map((r) => r.code), "INV-") + 1);
}
