import { prisma } from "@/lib/prisma";

function dayRange(from?: string, to?: string): { gte?: Date; lte?: Date } {
  const range: { gte?: Date; lte?: Date } = {};
  if (from) range.gte = new Date(`${from}T00:00:00.000Z`);
  if (to) range.lte = new Date(`${to}T23:59:59.999Z`);
  return range;
}

// Sales report based on invoices (revenue realized at invoice time).
export async function salesReport(from?: string, to?: string) {
  const createdAt = dayRange(from, to);
  const where =
    createdAt.gte || createdAt.lte ? { createdAt } : undefined;

  const invoices = await prisma.invoice.findMany({
    where,
    select: {
      total: true,
      amountPaid: true,
      balance: true,
      createdAt: true,
      returns: { select: { amount: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const totalSales = invoices.reduce((s, i) => s + i.total, 0);
  const totalCollected = invoices.reduce((s, i) => s + i.amountPaid, 0);
  const totalOutstanding = invoices.reduce((s, i) => s + i.balance, 0);
  const totalReturns = invoices.reduce(
    (s, i) => s + i.returns.reduce((a, r) => a + r.amount, 0),
    0,
  );

  const byDayMap = new Map<string, { sales: number; count: number }>();
  for (const inv of invoices) {
    const day = inv.createdAt.toISOString().slice(0, 10);
    const entry = byDayMap.get(day) ?? { sales: 0, count: 0 };
    entry.sales += inv.total;
    entry.count += 1;
    byDayMap.set(day, entry);
  }
  const byDay = Array.from(byDayMap.entries()).map(([day, v]) => ({
    day,
    sales: v.sales,
    invoices: v.count,
  }));

  return {
    invoiceCount: invoices.length,
    totalSales,
    totalCollected,
    totalOutstanding,
    totalReturns,
    byDay,
  };
}

// Top SKUs by quantity sold across invoiced orders.
export async function topSkus(limit = 10) {
  const items = await prisma.orderItem.findMany({
    where: { order: { invoice: { isNot: null } } },
    select: {
      qty: true,
      unitPrice: true,
      product: { select: { id: true, sku: true, name: true } },
    },
  });

  const map = new Map<
    string,
    { sku: string; name: string; qty: number; revenue: number }
  >();
  for (const it of items) {
    const key = it.product.id;
    const entry =
      map.get(key) ?? { sku: it.product.sku, name: it.product.name, qty: 0, revenue: 0 };
    entry.qty += it.qty;
    entry.revenue += it.qty * it.unitPrice;
    map.set(key, entry);
  }

  return Array.from(map.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, limit);
}

// Current stock + low-stock flags.
export async function stockReport() {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      sku: true,
      name: true,
      unit: true,
      stockQty: true,
      reorderLevel: true,
    },
  });
  return products.map((p) => ({
    ...p,
    lowStock:
      p.reorderLevel != null ? p.stockQty <= p.reorderLevel : false,
  }));
}

// Booker leaderboard: order count + sales value (invoiced orders).
export async function bookerLeaderboard() {
  const bookers = await prisma.user.findMany({
    where: { role: "booker" },
    select: { id: true, name: true, email: true, route: true },
  });

  const results = await Promise.all(
    bookers.map(async (b) => {
      const orders = await prisma.order.findMany({
        where: { bookerId: b.id },
        select: { subtotal: true, status: true, invoice: { select: { amountPaid: true } } },
      });
      const orderCount = orders.length;
      const salesValue = orders
        .filter((o) =>
          ["invoiced", "out_for_delivery", "delivered", "settled"].includes(
            o.status,
          ),
        )
        .reduce((s, o) => s + o.subtotal, 0);
      const collected = orders.reduce(
        (s, o) => s + (o.invoice?.amountPaid ?? 0),
        0,
      );
      const returns = await prisma.return.aggregate({
        where: { invoice: { order: { bookerId: b.id } } },
        _sum: { amount: true },
      });
      return {
        ...b,
        orderCount,
        salesValue,
        collected,
        returns: returns._sum.amount ?? 0,
      };
    }),
  );

  return results.sort((a, b) => b.salesValue - a.salesValue);
}
