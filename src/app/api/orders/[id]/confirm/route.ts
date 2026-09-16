export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { requireRole } from "@/server/auth/requireRole";
import { json } from "@/server/http";
import { transitionOrder } from "@/server/services/orders";

type Params = { id: string };

export const POST = requireRole<Params>(
  "owner",
  "office",
)(async (_req: NextRequest, { params, session }) => {
  const order = await transitionOrder(session, params.id, "confirmed");
  return json({ order });
});
