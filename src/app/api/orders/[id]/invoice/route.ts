import { NextRequest } from "next/server";
import { requireRole } from "@/server/auth/requireRole";
import { json } from "@/server/http";
import { generateInvoice } from "@/server/services/invoices";

type Params = { id: string };

export const POST = requireRole<Params>(
  "owner",
  "office",
)(async (_req: NextRequest, { params, session }) => {
  const invoice = await generateInvoice(session, params.id);
  return json({ invoice }, 201);
});
