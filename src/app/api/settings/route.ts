export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/server/auth/requireRole";
import { parseBody, json } from "@/server/http";
import { z } from "zod";

const KEYS = [
  "businessName",
  "officeHours",
  "bookersSeeOutstanding",
  "offlineCapture",
] as const;

const patchSchema = z.object({
  businessName: z.string().min(1).max(120).optional(),
  officeHours: z.string().min(1).max(40).optional(),
  bookersSeeOutstanding: z.boolean().optional(),
  offlineCapture: z.boolean().optional(),
});

export const GET = requireRole(
  "owner",
  "office",
  "booker",
)(async () => {
  const rows = await prisma.appSetting.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return json({
    businessName: map.businessName ?? "Raseed Traders",
    officeHours: map.officeHours ?? "09:00 – 19:00",
    bookersSeeOutstanding: map.bookersSeeOutstanding !== "false",
    offlineCapture: map.offlineCapture !== "false",
  });
});

export const PATCH = requireRole(
  "owner",
  "office",
)(async (req: NextRequest) => {
  const input = await parseBody(req, patchSchema);
  for (const key of KEYS) {
    const v = input[key];
    if (v === undefined) continue;
    const value = typeof v === "boolean" ? String(v) : v;
    await prisma.appSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
  const rows = await prisma.appSetting.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return json({
    businessName: map.businessName ?? "Raseed Traders",
    officeHours: map.officeHours ?? "09:00 – 19:00",
    bookersSeeOutstanding: map.bookersSeeOutstanding !== "false",
    offlineCapture: map.offlineCapture !== "false",
  });
});
