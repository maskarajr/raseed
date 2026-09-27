import { prisma } from "@/lib/prisma";
import { startOfTodayKarachi, endOfTodayKarachi } from "@/lib/day";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/enums";

export async function officeHomeSummary() {
  const start = startOfTodayKarachi();
  const end = endOfTodayKarachi();
  const yStart = new Date(start.getTime() - 24 * 60 * 60 * 1000);

  const [
    todayOrders,
    yesterdayOrders,
    outstandingInvoices,
    submittedOrders,
    products,
    collectedToday,
    stageCounts,
  ] = await Promise.all([
    prisma.order.findMany({
      where: {
        createdAt: { gte: start, lt: end },
        status: { not: "cancelled" },
      },
      select: { subtotal: true },
    }),
    prisma.order.findMany({
      where: {
        createdAt: { gte: yStart, lt: start },
        status: { not: "cancelled" },
      },
      select: { subtotal: true },
    }),
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
    prisma.order.findMany({
      where: { status: "submitted" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        code: true,
        status: true,
        createdAt: true,
        subtotal: true,
        booker: { select: { name: true } },
        customer: { select: { name: true } },
        _count: { select: { items: true } },
      },
    }),
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
    prisma.payment.aggregate({
      where: { createdAt: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
    // One aggregation powers the board's lifecycle pipeline. Cancelled is a
    // real column on the board, so it is included rather than filtered out.
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
      _sum: { subtotal: true },
    }),
  ]);

  const bookedToday = todayOrders.reduce((s, o) => s + o.subtotal, 0);
  const bookedYesterday = yesterdayOrders.reduce((s, o) => s + o.subtotal, 0);
  const outstanding = outstandingInvoices.reduce((s, i) => s + i.balance, 0);
  const lowStockRows = products.filter(
    (p) => p.reorderLevel != null && p.stockQty <= p.reorderLevel,
  );
  const outOfStock = products.filter((p) => p.stockQty <= 0).length;
  const oldest = submittedOrders[0];
  const oldestMins = oldest
    ? Math.max(
        0,
        Math.round((Date.now() - oldest.createdAt.getTime()) / 60000),
      )
    : 0;

  // Board order, always all eight stages, so the frontend never has to guess
  // which stages are missing.
  const countByStatus = new Map(
    stageCounts.map((s) => [s.status, s] as const),
  );
  const pipeline = ORDER_STATUSES.map((status: OrderStatus) => {
    const row = countByStatus.get(status);
    return {
      status,
      count: row?._count._all ?? 0,
      value: row?._sum.subtotal ?? 0,
    };
  });

  return {
    kpis: {
      bookedToday,
      bookedYesterday,
      ordersToday: todayOrders.length,
      outstanding,
      outstandingCount: outstandingInvoices.length,
      collectedToday: collectedToday._sum.amount ?? 0,
      awaitingConfirm: submittedOrders.length,
      oldestAwaitingMins: oldestMins,
      lowStock: lowStockRows.length,
      outOfStock,
    },
    pipeline,
    submitted: submittedOrders.map((o) => ({
      id: o.id,
      code: o.code,
      status: o.status,
      createdAt: o.createdAt,
      booker: o.booker.name,
      customer: o.customer.name,
      subtotal: o.subtotal,
      items: o._count.items,
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
