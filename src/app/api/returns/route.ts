import { NextRequest } from "next/server";
import { requireRole } from "@/server/auth/requireRole";
import { parseBody, json } from "@/server/http";
import { createReturnSchema } from "@/server/schemas/returns";
import { logReturn } from "@/server/services/returns";

export const POST = requireRole(
  "owner",
  "office",
)(async (req: NextRequest, { session }) => {
  const input = await parseBody(req, createReturnSchema);
  const result = await logReturn(session, input);
  return json(result, 201);
});
