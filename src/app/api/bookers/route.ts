import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/server/auth/requireRole";
import { parseBody, json, ApiError } from "@/server/http";
import { createBookerSchema } from "@/server/schemas/bookers";
import { hashPassword } from "@/lib/password";
import { startOfTodayKarachi, endOfTodayKarachi } from "@/lib/day";

export const GET = requireRole(
  "owner",
  "office",
)(async () => {
  const start = startOfTodayKarachi();
  const end = endOfTodayKarachi();
  const bookers = await prisma.user.findMany({
    where: { role: "booker" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      route: true,
      active: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const withStats = await Promise.all(
    bookers.map(async (b) => {
      const todayOrders = await prisma.order.findMany({
        where: {
          bookerId: b.id,
          createdAt: { gte: start, lt: end },
          status: { not: "cancelled" },
        },
        select: { subtotal: true, status: true },
      });
      const collected = await prisma.payment.aggregate({
        where: {
          createdBy: b.id,
          createdAt: { gte: start, lt: end },
        },
        _sum: { amount: true },
      });
      return {
        ...b,
        ordersToday: todayOrders.length,
        valueToday: todayOrders.reduce((s, o) => s + o.subtotal, 0),
        collectedToday: collected._sum.amount ?? 0,
      };
    }),
  );

  return json({ bookers: withStats });
});

export const POST = requireRole(
  "owner",
  "office",
)(async (req: NextRequest) => {
  const input = await parseBody(req, createBookerSchema);
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existing) throw new ApiError(409, "Email already in use");

  const passwordHash = await hashPassword(input.password);
  const booker = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: "booker",
      phone: input.phone,
      route: input.route,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      route: true,
      active: true,
      createdAt: true,
    },
  });
  return json({ booker }, 201);
});
