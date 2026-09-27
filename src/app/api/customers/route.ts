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
)(async (req: NextRequest, { session }) => {
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
  // Booker scoping: a booker only ever sees the shops assigned to them — the
  // same rule /api/orders and /api/invoices apply. Unassigned shops stay on the
  // office side until an owner assigns them.
  if (session.role === "booker") where.bookerId = session.id;

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
    where: rows.length ? { customerId: { in: rows.map((r) => r.id) } } : undefined,
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
  // Write side of the same scoping rule: a booker always ends up owning the shop
  // they capture, and may not hand it to another booker. Without this, shops
  // created from the PWA land unassigned and then disappear from the booker's
  // own (now scoped) list.
  const bookerId =
    session.role === "booker" ? session.id : input.bookerId ?? null;
  const customer = await prisma.customer.create({
    data: {
      name: input.name,
      phone: input.phone ?? "",
      address: input.address,
      area: input.area,
      route: input.route,
      ntn: input.ntn,
      bookerId,
      createdBy: session.id,
    },
  });
  return json({ customer }, 201);
});
