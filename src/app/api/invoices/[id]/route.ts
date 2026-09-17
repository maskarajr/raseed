export const dynamic = "force-dynamic";
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
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: {
      order: {
        include: {
          customer: true,
          booker: { select: { name: true } },
          items: {
            include: {
              product: { select: { sku: true, name: true, unit: true } },
            },
          },
        },
      },
      payments: { orderBy: { createdAt: "desc" } },
      returns: {
        orderBy: { createdAt: "desc" },
        include: { product: { select: { sku: true, name: true } } },
      },
    },
  });
  if (!invoice) throw new ApiError(404, "Invoice not found");
  if (session.role === "booker" && invoice.order.bookerId !== session.id) {
    throw new ApiError(403, "Forbidden");
  }
  return json({ invoice });
});
