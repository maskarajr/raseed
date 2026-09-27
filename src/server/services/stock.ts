import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { StockReason } from "@/lib/enums";
import { ApiError } from "@/server/http";

// Every stockQty mutation AND StockLedger write in the entire app goes through
// this function. Nothing else may touch Product.stockQty or StockLedger.
//
// Must be called with a Prisma transaction client so the movement is atomic
// with the surrounding business operation (order/invoice/return/payment).

export type StockMovement = {
  productId: string;
  delta: number; // signed: positive = restock, negative = deduct
  reason: StockReason;
  createdBy: string;
  refType?: string;
  refId?: string;
};

export async function applyStockMovement(
  tx: Prisma.TransactionClient,
  movement: StockMovement,
): Promise<{ balanceAfter: number }> {
  const { productId, delta, reason, createdBy, refType, refId } = movement;

  if (!Number.isInteger(delta)) {
    throw new ApiError(400, "Stock delta must be an integer");
  }

  const product = await tx.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new ApiError(404, `Product not found: ${productId}`);
  }

  const balanceAfter = product.stockQty + delta;

  // Negative stock is intentionally allowed: the soft stock warning is
  // non-blocking, so an order/invoice may legitimately drive stock below zero
  // until a purchase restocks it. This keeps invoicing from ever failing.

  await tx.product.update({
    where: { id: productId },
    data: { stockQty: balanceAfter },
  });

  await tx.stockLedger.create({
    data: {
      productId,
      delta,
      reason,
      refType,
      refId,
      balanceAfter,
      createdBy,
    },
  });

  return { balanceAfter };
}

// Convenience wrapper for standalone stock movements (e.g. manual office
// adjustments / purchases) that are not part of a larger business operation.
// Still runs inside its own transaction.
export async function applyStockMovementStandalone(
  movement: StockMovement,
): Promise<{ balanceAfter: number }> {
  return prisma.$transaction((tx) => applyStockMovement(tx, movement));
}

// Batched form for callers that move stock for MANY lines in one transaction
// (e.g. generateInvoice deducting every line of an order). Same invariant: all
// stockQty writes + StockLedger rows live in this service.
//
// Why this exists: the per-line applyStockMovement does one product.findUnique
// READ per line. Against a high-latency remote DB (Turso over libsql) those
// sequential reads were the exact operations that pushed a multi-line invoice
// past Prisma's interactive-transaction timeout and threw P2028 ("query cannot
// be executed on an expired transaction"). Here every product is read ONCE via
// findMany, then per-line writes proceed with a running balance so duplicate
// product lines stay correct. This keeps the audit trail identical (one ledger
// row per movement) while cutting round-trips.
export async function applyStockMovements(
  tx: Prisma.TransactionClient,
  movements: StockMovement[],
): Promise<void> {
  if (movements.length === 0) return;
  for (const m of movements) {
    if (!Number.isInteger(m.delta)) {
      throw new ApiError(400, "Stock delta must be an integer");
    }
  }

  const productIds = [...new Set(movements.map((m) => m.productId))];
  const products = await tx.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, stockQty: true },
  });
  // Running stock per product, updated as each movement is applied so repeated
  // lines for the same product accumulate correctly.
  const running = new Map(products.map((p) => [p.id, p.stockQty] as const));

  for (const m of movements) {
    const current = running.get(m.productId);
    if (current === undefined) {
      throw new ApiError(404, `Product not found: ${m.productId}`);
    }
    const balanceAfter = current + m.delta;
    running.set(m.productId, balanceAfter);
    await tx.product.update({
      where: { id: m.productId },
      data: { stockQty: balanceAfter },
    });
    await tx.stockLedger.create({
      data: {
        productId: m.productId,
        delta: m.delta,
        reason: m.reason,
        refType: m.refType,
        refId: m.refId,
        balanceAfter,
        createdBy: m.createdBy,
      },
    });
  }
}
