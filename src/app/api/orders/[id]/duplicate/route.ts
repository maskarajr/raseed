import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/server/auth/requireRole";
import { json, ApiError } from "@/server/http";
import { nextOrderCode } from "@/server/services/codes";

type Params = { id: string };

export const POST = requireRole<Params>(
  "owner",
  "office",
)(async (_req: NextRequest, { params }) => {
  const source = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true },
  });
  if (!source) throw new ApiError(404, "Order not found");
  if (source.status === "cancelled") {
    throw new ApiError(400, "Cannot duplicate a cancelled order");
  }

  const code = await nextOrderCode(prisma);
  const order = await prisma.order.create({
    data: {
      code,
      bookerId: source.bookerId,
      customerId: source.customerId,
      notes: source.notes,
      status: "draft",
      subtotal: source.subtotal,
      advance: 0,
      items: {
        create: source.items.map((i) => ({
          productId: i.productId,
          qty: i.qty,
          unitPrice: i.unitPrice,
        })),
      },
    },
  });
  return json({ order }, 201);
});
