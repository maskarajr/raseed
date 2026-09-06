import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/server/auth/requireRole";
import { parseBody, parseQuery, json } from "@/server/http";
import {
  createCustomerSchema,
  listCustomersQuerySchema,
} from "@/server/schemas/customers";
import type { Prisma } from "@prisma/client";

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
    ];
  }
  const customers = await prisma.customer.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return json({ customers });
});

export const POST = requireRole(
  "owner",
  "office",
  "booker",
)(async (req: NextRequest, { session }) => {
  const input = await parseBody(req, createCustomerSchema);
  const customer = await prisma.customer.create({
    data: { ...input, createdBy: session.id },
  });
  return json({ customer }, 201);
});
