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
