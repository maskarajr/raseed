export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/server/auth/requireRole";
import { parseBody, parseQuery, json } from "@/server/http";
import {
  createCustomerSchema,
  listCustomersQuerySchema,
} from "@/server/schemas/customers";
import type { Prisma } from "@/generated/prisma/client";

export const GET = requireRole(
  "owner",
  "office",
  "booker",
)(async (req: NextRequest) => {
  const q = parseQuery(req, listCustomersQuerySchema);
  const where: Prisma.CustomerWhereInput = {};
  if (q.search) {
    where.OR = [
      { name: { contains: q.search } },
      { phone: { contains: q.search } },
      { area: { contains: q.search } },
      { route: { contains: q.search } },
    ];
  }
  const rows = await prisma.customer.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      booker: { select: { id: true, name: true } },
    },
  });
  const balances = await prisma.invoice.groupBy({
    by: ["customerId"],
    _sum: { balance: true },
  });
  const byCust = new Map(balances.map((b) => [b.customerId, b._sum.balance ?? 0]));
  const customers = rows.map((c) => ({
    ...c,
    outstanding: byCust.get(c.id) ?? 0,
  }));
  return json({ customers });
});

export const POST = requireRole(
  "owner",
  "office",
  "booker",
)(async (req: NextRequest, { session }) => {
  const input = await parseBody(req, createCustomerSchema);
  const customer = await prisma.customer.create({
    data: {
      name: input.name,
      phone: input.phone ?? "",
      address: input.address,
      area: input.area,
      route: input.route,
      bookerId: input.bookerId,
      createdBy: session.id,
    },
  });
  return json({ customer }, 201);
});
