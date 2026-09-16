export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/server/auth/requireRole";
import { parseQuery, json } from "@/server/http";
import { ledgerQuerySchema } from "@/server/schemas/stock";
import type { Prisma } from "@/generated/prisma/client";

export const GET = requireRole(
  "owner",
  "office",
)(async (req: NextRequest) => {
  const q = parseQuery(req, ledgerQuerySchema);
  const where: Prisma.StockLedgerWhereInput = {};
  if (q.productId) where.productId = q.productId;

  const entries = await prisma.stockLedger.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { product: { select: { sku: true, name: true } } },
  });
  return json({ entries });
});
