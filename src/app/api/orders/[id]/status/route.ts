import { NextRequest } from "next/server";
import { requireRole } from "@/server/auth/requireRole";
import { parseBody, json } from "@/server/http";
import { advanceStatusSchema } from "@/server/schemas/orders";
import { transitionOrder } from "@/server/services/orders";

type Params = { id: string };

export const POST = requireRole<Params>(
  "owner",
  "office",
)(async (req: NextRequest, { params, session }) => {
  const { status } = await parseBody(req, advanceStatusSchema);
  const order = await transitionOrder(session, params.id, status);
  return json({ order });
});
