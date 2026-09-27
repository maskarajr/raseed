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
  bookedCollectedSeries,
} from "@/server/services/reports";

export const GET = requireRole(
  "owner",
  "office",
)(async (req: NextRequest) => {
  const q = parseQuery(req, salesReportQuerySchema);
  const [sales, tops, stock, bookers, series] = await Promise.all([
    salesReport(q.from, q.to),
    topSkus(),
    stockReport(),
    bookerLeaderboard(),
    q.range === "7d" ? bookedCollectedSeries(7) : Promise.resolve(undefined),
  ]);
  // `series` is only present for ?range=7d; every existing caller's payload is
  // byte-identical to before.
  return json({ sales, topSkus: tops, stock, bookers, ...(series ? { series } : {}) });
});
