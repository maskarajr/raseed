import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/server/auth/requireRole";
import { parseBody, json, ApiError } from "@/server/http";
import { z } from "zod";

type Params = { id: string };

const schema = z.object({
  bookerId: z.string().min(1),
});

export const POST = requireRole<Params>(
  "owner",
  "office",
)(async (req: NextRequest, { params }) => {
  const { bookerId } = await parseBody(req, schema);
  const booker = await prisma.user.findUnique({ where: { id: bookerId } });
  if (!booker || booker.role !== "booker" || !booker.active) {
    throw new ApiError(400, "Invalid booker");
  }
  const existing = await prisma.order.findUnique({ where: { id: params.id } });
  if (!existing) throw new ApiError(404, "Order not found");
  if (["settled", "cancelled"].includes(existing.status)) {
    throw new ApiError(400, "Cannot reassign this order");
  }
  const order = await prisma.order.update({
    where: { id: params.id },
    data: { bookerId },
    include: { booker: { select: { id: true, name: true } } },
  });
  return json({ order });
});
