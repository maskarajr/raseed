import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/server/auth/requireRole";
import { parseBody, parseQuery, json, ApiError } from "@/server/http";
import {
  createOrderSchema,
  listOrdersQuerySchema,
} from "@/server/schemas/orders";
import { createOrder } from "@/server/services/orders";
import type { Prisma } from "@prisma/client";

export const GET = requireRole(
  "owner",
  "office",
  "booker",
)(async (req: NextRequest, { session }) => {
  const q = parseQuery(req, listOrdersQuerySchema);
  const where: Prisma.OrderWhereInput = {};
  if (q.status) where.status = q.status;
  // Booker scoping: only ever their own orders.
  if (session.role === "booker") where.bookerId = session.id;

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { name: true, area: true } },
      booker: { select: { name: true } },
      invoice: {
        select: {
          id: true,
          code: true,
          paymentStatus: true,
          balance: true,
          amountPaid: true,
        },
      },
      _count: { select: { items: true } },
    },
    take: 200,
  });
  return json({ orders });
});

export const POST = requireRole(
  "owner",
  "office",
  "booker",
)(async (req: NextRequest, { session }) => {
  const input = await parseBody(req, createOrderSchema);

  // Booker scoping: bookers always create for themselves.
  let bookerId: string;
  if (session.role === "booker") {
    bookerId = session.id;
  } else {
    if (!input.bookerId) {
      throw new ApiError(400, "bookerId is required when office creates an order");
    }
    bookerId = input.bookerId;
  }

  const result = await createOrder({
    customerId: input.customerId,
    bookerId,
    notes: input.notes,
    items: input.items,
    submit: input.submit ?? false,
    advance: input.advance,
  });
  return json(result, 201);
});
