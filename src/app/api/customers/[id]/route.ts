import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/server/auth/requireRole";
import { parseBody, json, ApiError } from "@/server/http";
import { updateCustomerSchema } from "@/server/schemas/customers";

type Params = { id: string };

export const GET = requireRole<Params>(
  "owner",
  "office",
  "booker",
)(async (_req: NextRequest, { params }) => {
  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
  });
  if (!customer) throw new ApiError(404, "Customer not found");
  return json({ customer });
});

export const PATCH = requireRole<Params>(
  "owner",
  "office",
  "booker",
)(async (req: NextRequest, { params }) => {
  const input = await parseBody(req, updateCustomerSchema);
  const existing = await prisma.customer.findUnique({
    where: { id: params.id },
  });
  if (!existing) throw new ApiError(404, "Customer not found");
  const customer = await prisma.customer.update({
    where: { id: params.id },
    data: input,
  });
  return json({ customer });
});
