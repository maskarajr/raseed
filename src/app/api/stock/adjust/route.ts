export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { requireRole } from "@/server/auth/requireRole";
import { parseBody, json } from "@/server/http";
import { stockAdjustmentSchema } from "@/server/schemas/stock";
import { applyStockMovementStandalone } from "@/server/services/stock";
import type { StockReason } from "@/lib/enums";

export const POST = requireRole(
  "owner",
  "office",
)(async (req: NextRequest, { session }) => {
  const input = await parseBody(req, stockAdjustmentSchema);
  const { balanceAfter } = await applyStockMovementStandalone({
    productId: input.productId,
    delta: input.delta,
    reason: input.reason as StockReason,
    createdBy: session.id,
    refType: "manual",
  });
  return json({ balanceAfter }, 201);
});
