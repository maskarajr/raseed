export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { requireRole } from "@/server/auth/requireRole";
import { parseBody, json } from "@/server/http";
import { batchOrderActionSchema } from "@/server/schemas/orders";
import { batchOrderAction } from "@/server/services/orders";

// Batch surface for the Orders-page 'Confirm All' / 'Invoice All' buttons and
// the dashboard card. Office/owner only — bookers keep the per-order routes.
// Always answers 200 with an ok/failed split; individual rejections live in
// `failed`, never in the HTTP status.
export const POST = requireRole(
  "owner",
  "office",
)(async (req: NextRequest, { session }) => {
  const { action, ids } = await parseBody(req, batchOrderActionSchema);
  const result = await batchOrderAction(session, action, ids);
  return json(result);
});
