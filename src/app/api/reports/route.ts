export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { requireRole } from "@/server/auth/requireRole";
import { parseQuery, json } from "@/server/http";
import { salesReportQuerySchema } from "@/server/schemas/reports";
import {
  salesReport,
  topSkus,
  stockReport,
  bookerLeaderboard,
} from "@/server/services/reports";

export const GET = requireRole(
  "owner",
  "office",
)(async (req: NextRequest) => {
  const q = parseQuery(req, salesReportQuerySchema);
  const [sales, tops, stock, bookers] = await Promise.all([
    salesReport(q.from, q.to),
    topSkus(),
    stockReport(),
    bookerLeaderboard(),
  ]);
  return json({ sales, topSkus: tops, stock, bookers });
});
