export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { requireRole } from "@/server/auth/requireRole";
import { parseBody, json } from "@/server/http";
import { createPaymentSchema } from "@/server/schemas/payments";
import { recordPayment } from "@/server/services/payments";

export const POST = requireRole(
  "owner",
  "office",
  "booker",
)(async (req: NextRequest, { session }) => {
  const input = await parseBody(req, createPaymentSchema);
  const result = await recordPayment(session, input);
  return json(result, 201);
});
