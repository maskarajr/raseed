import { prisma } from "@/lib/prisma";
import { requireRole } from "@/server/auth/requireRole";
import { json } from "@/server/http";

export const GET = requireRole(
  "owner",
  "office",
)(async () => {
  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      order: {
        select: {
          code: true,
          customer: { select: { name: true } },
        },
      },
    },
  });
  return json({ invoices });
});
