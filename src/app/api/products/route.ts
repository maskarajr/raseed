export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/server/auth/requireRole";
import { parseBody, parseQuery, json } from "@/server/http";
import {
  createProductSchema,
  listProductsQuerySchema,
} from "@/server/schemas/products";
import type { Prisma } from "@/generated/prisma/client";

export const GET = requireRole(
  "owner",
  "office",
  "booker",
)(async (req: NextRequest) => {
  const q = parseQuery(req, listProductsQuerySchema);
  const where: Prisma.ProductWhereInput = {};
  if (q.search) {
    where.OR = [
      { name: { contains: q.search } },
      { sku: { contains: q.search } },
    ];
  }
  if (q.active) where.active = q.active === "true";

  let products = await prisma.product.findMany({
    where,
    orderBy: { name: "asc" },
  });

  if (q.lowStock === "true") {
    products = products.filter(
      (p) => p.reorderLevel != null && p.stockQty <= p.reorderLevel,
    );
  }

  return json({ products });
});

export const POST = requireRole(
  "owner",
  "office",
)(async (req: NextRequest) => {
  const input = await parseBody(req, createProductSchema);
  const product = await prisma.product.create({ data: input });
  return json({ product }, 201);
});
