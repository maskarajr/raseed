export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/server/auth/requireRole";
import { json, ApiError, parseBody } from "@/server/http";
import { editDraftOrderSchema } from "@/server/schemas/orders";
import { editDraftOrder } from "@/server/services/orders";

type Params = { id: string };

export const GET = requireRole<Params>(
  "owner",
  "office",
  "booker",
)(async (_req: NextRequest, { params, session }) => {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      booker: { select: { id: true, name: true } },
      items: { include: { product: { select: { sku: true, name: true, unit: true, stockQty: true, reorderLevel: true } } } },
      // Spec E §9 detail-card fix (Privy seq476): the booker card must render
      // real returns when they exist, so paid > total stays legible instead of
      // silently clamping. Additive select — amounts only, no PII.
      invoice: { include: { returns: { select: { amount: true } } } },
    },
  });
  if (!order || (session.role === "booker" && order.bookerId !== session.id)) {
    // Tenant-safe read: a booker may only ever see their OWN order. A missing
    // id and another booker's id return the IDENTICAL 404 so the response never
    // leaks whether an order exists (Figmi seq206 §2). Office/owner bypass this.
    throw new ApiError(404, "Order not found");
  }
  return json({ order });
});

// Draft-only edit (Privy seq211). Owns no state transition — it mutates a draft's
// items/notes/advance; submit/cancel/invoice stay on their dedicated routes.
export const PATCH = requireRole<Params>(
  "owner",
  "office",
  "booker",
)(async (req: NextRequest, { params, session }) => {
  const input = await parseBody(req, editDraftOrderSchema);
  const order = await editDraftOrder(session, params.id, input);
  return json({ order });
});
