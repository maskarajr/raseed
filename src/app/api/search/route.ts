import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/server/auth/requireRole";
import { json } from "@/server/http";

export const GET = requireRole(
  "owner",
  "office",
)(async (req: NextRequest) => {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return json({ orders: [], customers: [], products: [] });
  }

  const [orders, customers, products] = await Promise.all([
    prisma.order.findMany({
      where: {
        OR: [
          { code: { contains: q } },
          { customer: { name: { contains: q } } },
        ],
      },
      take: 8,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        code: true,
        status: true,
        customer: { select: { name: true } },
      },
    }),
    prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { area: { contains: q } },
          { route: { contains: q } },
        ],
      },
      take: 8,
      select: { id: true, name: true, area: true, route: true },
    }),
    prisma.product.findMany({
      where: {
        OR: [{ sku: { contains: q } }, { name: { contains: q } }],
      },
      take: 8,
      select: { id: true, sku: true, name: true },
    }),
  ]);

  return json({ orders, customers, products });
});
