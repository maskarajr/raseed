import { prisma } from "@/lib/prisma";
import { startOfTodayKarachi, endOfTodayKarachi } from "@/lib/day";

// Read-only aggregation powering the Office Home dashboard. Pure reads — no
// ledger writes, no status transitions. Deliberately separate from reports.ts
// so the dashboard can evolve without perturbing report semantics used
// elsewhere (leaderboard, sales, print, etc.).
export async function officeHomeSummary() {
  const start = startOfTodayKarachi();
  const end = endOfTodayKarachi();

  const [todayOrders, outstandingInvoices, submittedOrders, products] =
    await Promise.all([
      // Booked today = subtotal of non-cancelled orders created within Today (PKT).
      prisma.order.findMany({
        where: {
          createdAt: { gte: start, lt: end },
          status: { not: "cancelled" },
        },
        select: { subtotal: true },
      }),
      // Outstanding = every invoice still carrying a positive balance.
      prisma.invoice.findMany({
        where: { balance: { gt: 0 } },
        orderBy: { balance: "desc" },
        select: {
          id: true,
          code: true,
          balance: true,
          order: { select: { customer: { select: { name: true } } } },
        },
      }),
      // Awaiting confirm = orders sitting in 'submitted'.
      prisma.order.findMany({
        where: { status: "submitted" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          code: true,
          createdAt: true,
          subtotal: true,
          booker: { select: { name: true } },
          customer: { select: { name: true } },
        },
      }),
      // Low stock candidates (active products only).
      prisma.product.findMany({
        where: { active: true },
        orderBy: { stockQty: "asc" },
        select: {
          id: true,
          sku: true,
          name: true,
          stockQty: true,
          reorderLevel: true,
        },
      }),
    ]);

  const bookedToday = todayOrders.reduce((s, o) => s + o.subtotal, 0);
  const outstanding = outstandingInvoices.reduce((s, i) => s + i.balance, 0);

  const lowStockRows = products.filter(
    (p) => p.reorderLevel != null && p.stockQty <= p.reorderLevel,
  );

  return {
    kpis: {
      bookedToday,
      outstanding,
      awaitingConfirm: submittedOrders.length,
      lowStock: lowStockRows.length,
    },
    submitted: submittedOrders.map((o) => ({
      id: o.id,
      code: o.code,
      createdAt: o.createdAt,
      booker: o.booker.name,
      customer: o.customer.name,
      subtotal: o.subtotal,
    })),
    lowStock: lowStockRows.map((p) => ({
      sku: p.sku,
      name: p.name,
      stockQty: p.stockQty,
      reorderLevel: p.reorderLevel,
    })),
    outstandingInvoices: outstandingInvoices.slice(0, 8).map((i) => ({
      id: i.id,
      code: i.code,
      customer: i.order.customer.name,
      balance: i.balance,
    })),
  };
}
