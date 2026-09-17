export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/server/auth/requireRole";
import { json } from "@/server/http";

export const GET = requireRole(
  "owner",
  "office",
  "booker",
)(async (_req: NextRequest, { session }) => {
  const invoices = await prisma.invoice.findMany({
    where:
      session.role === "booker"
        ? { order: { bookerId: session.id } }
        : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      order: {
        select: {
          code: true,
          booker: { select: { name: true } },
          customer: { select: { name: true } },
        },
      },
    },
  });
  return json({ invoices });
});
