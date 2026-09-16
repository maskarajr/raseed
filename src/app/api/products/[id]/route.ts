export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/server/auth/requireRole";
import { parseBody, json, ApiError } from "@/server/http";
import { updateProductSchema } from "@/server/schemas/products";

type Params = { id: string };

export const GET = requireRole<Params>(
  "owner",
  "office",
  "booker",
)(async (_req: NextRequest, { params }) => {
  const product = await prisma.product.findUnique({ where: { id: params.id } });
  if (!product) throw new ApiError(404, "Product not found");
  return json({ product });
});

export const PATCH = requireRole<Params>(
  "owner",
  "office",
)(async (req: NextRequest, { params }) => {
  const input = await parseBody(req, updateProductSchema);
  const existing = await prisma.product.findUnique({
    where: { id: params.id },
  });
  if (!existing) throw new ApiError(404, "Product not found");
  const product = await prisma.product.update({
    where: { id: params.id },
    data: input,
  });
  return json({ product });
});
