import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/server/auth/requireRole";
import { json, ApiError } from "@/server/http";

type Params = { id: string };

export const GET = requireRole<Params>(
  "owner",
  "office",
  "booker",
)(async (_req: NextRequest, { params, session }) => {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      booker: { select: { id: true, name: true } },
      items: { include: { product: { select: { sku: true, name: true, unit: true } } } },
      invoice: true,
    },
  });
  if (!order) throw new ApiError(404, "Order not found");
  // Booker scoping.
  if (session.role === "booker" && order.bookerId !== session.id) {
    throw new ApiError(403, "Forbidden");
  }
  return json({ order });
});
