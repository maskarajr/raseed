import { prisma } from "@/lib/prisma";
import {
  startOfTodayKarachi,
  endOfTodayKarachi,
  karachiDateKey,
  startDaysAgoKarachi,
} from "@/lib/day";

function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function fillDaily(
  start: Date,
  endExclusive: Date,
  amounts: Map<string, number>,
): { date: string; revenue: number }[] {
  const rows: { date: string; revenue: number }[] = [];
  for (
    let t = start.getTime();
    t < endExclusive.getTime();
    t += 24 * 60 * 60 * 1000
  ) {
    const date = karachiDateKey(new Date(t));
    rows.push({ date, revenue: amounts.get(date) ?? 0 });
  }
  return rows;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

// Read-only aggregation powering the Office Home dashboard. Pure reads — no
// ledger writes, no status transitions. Deliberately separate from reports.ts
// so the dashboard can evolve without perturbing report semantics used
// elsewhere (leaderboard, sales, print, etc.).
export async function officeHomeSummary() {
  const start = startOfTodayKarachi();
  const end = endOfTodayKarachi();
  const yesterdayStart = startDaysAgoKarachi(1);
  const last7Start = startDaysAgoKarachi(6);
  const last90Start = startDaysAgoKarachi(89);

  const [
    todayOrders,
    yesterdayOrders,
    outstandingInvoices,
    submittedOrders,
    products,
    seriesOrders,
    recentReturns,
    recentInvoices,
    categoryItems,
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
        createdAt: { gte: yesterdayStart, lt: start },
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
    prisma.order.findMany({
      where: {
        createdAt: { gte: last90Start, lt: end },
        status: { not: "cancelled" },
      },
      select: { subtotal: true, createdAt: true },
    }),
    prisma.return.findMany({
      where: { createdAt: { gte: last7Start, lt: end } },
      select: { amount: true, createdAt: true },
    }),
    prisma.invoice.findMany({
      where: { createdAt: { gte: last7Start, lt: end } },
      select: { createdAt: true },
    }),
    prisma.orderItem.findMany({
      where: {
        order: {
          invoice: {
            is: { createdAt: { gte: last7Start, lt: end } },
          },
        },
      },
      select: {
        qty: true,
        unitPrice: true,
        product: { select: { category: true, sku: true } },
      },
    }),
  ]);

  const bookedToday = todayOrders.reduce((s, o) => s + o.subtotal, 0);
  const bookedYesterday = yesterdayOrders.reduce((s, o) => s + o.subtotal, 0);
  const outstanding = outstandingInvoices.reduce((s, i) => s + i.balance, 0);

  const lowStockRows = products.filter(
    (p) => p.reorderLevel != null && p.stockQty <= p.reorderLevel,
  );

  const bookedByDayMap = new Map<string, number>();
  for (const o of seriesOrders) {
    const key = karachiDateKey(o.createdAt);
    bookedByDayMap.set(key, (bookedByDayMap.get(key) ?? 0) + o.subtotal);
  }
  const bookedByDay = fillDaily(last90Start, end, bookedByDayMap);

  const returnsByDay = new Map<string, { amount: number; count: number }>();
  for (const r of recentReturns) {
    const key = karachiDateKey(r.createdAt);
    const row = returnsByDay.get(key) ?? { amount: 0, count: 0 };
    row.amount += r.amount;
    row.count += 1;
    returnsByDay.set(key, row);
  }
  const invoicesByDay = new Map<string, number>();
  for (const inv of recentInvoices) {
    const key = karachiDateKey(inv.createdAt);
    invoicesByDay.set(key, (invoicesByDay.get(key) ?? 0) + 1);
  }

  const last7: {
    day: string;
    date: string;
    amount: number;
    count: number;
    returnRate: number;
  }[] = [];
  for (
    let t = last7Start.getTime();
    t < end.getTime();
    t += 24 * 60 * 60 * 1000
  ) {
    const d = new Date(t);
    const date = karachiDateKey(d);
    const shifted = new Date(d.getTime() + 5 * 60 * 60 * 1000);
    const weekdayIndex = shifted.getUTCDay();
    const day = WEEKDAYS[weekdayIndex] ?? "Sun";
    const rec = returnsByDay.get(date) ?? { amount: 0, count: 0 };
    const invCount = invoicesByDay.get(date) ?? 0;
    last7.push({
      day,
      date,
      amount: rec.amount,
      count: rec.count,
      returnRate: invCount > 0 ? (rec.count / invCount) * 100 : 0,
    });
  }

  const todayKey = karachiDateKey(start);
  const todayReturns = returnsByDay.get(todayKey) ?? { amount: 0, count: 0 };
  const todayInvoices = invoicesByDay.get(todayKey) ?? 0;

  const catMap = new Map<string, number>();
  for (const it of categoryItems) {
    const label = it.product.category?.trim() || it.product.sku;
    catMap.set(label, (catMap.get(label) ?? 0) + it.qty * it.unitPrice);
  }
  const catTotal = Array.from(catMap.values()).reduce((s, n) => s + n, 0);
  const categoryShare =
    catTotal === 0
      ? []
      : Array.from(catMap.entries())
          .map(([category, revenue]) => ({
            category,
            share: Math.round((revenue / catTotal) * 1000) / 10,
          }))
          .sort((a, b) => b.share - a.share);

  return {
    kpis: {
      bookedToday,
      outstanding,
      awaitingConfirm: submittedOrders.length,
      lowStock: lowStockRows.length,
      ordersToday: todayOrders.length,
      bookedTodayDeltaPct: pctDelta(bookedToday, bookedYesterday),
      ordersTodayDeltaPct: pctDelta(todayOrders.length, yesterdayOrders.length),
    },
    bookedByDay,
    returns: {
      todayCount: todayReturns.count,
      todayAmount: todayReturns.amount,
      todayRatePct:
        todayInvoices > 0 ? (todayReturns.count / todayInvoices) * 100 : null,
      last7,
    },
    categoryShare,
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
