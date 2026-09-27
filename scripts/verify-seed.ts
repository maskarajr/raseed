/**
 * Seed/data integrity verifier.
 *
 * Run against any database the app can point at:
 *   DATABASE_URL=<url> npx tsx scripts/verify-seed.ts
 *
 * Exits non-zero on the first breach list that is non-empty, printing counts
 * plus a few example ids. This is the check that the demo scenario (and, more
 * importantly, anything the app itself writes) keeps the money and stock
 * invariants the services enforce at runtime.
 */
import { prisma } from "../src/lib/prisma";
import {
  ORDER_STATUSES,
  PAYMENT_MODES,
  PAYMENT_STATUSES,
  STOCK_REASONS,
  type OrderStatus,
} from "../src/lib/enums";
import { deriveInvoiceState } from "../src/server/services/invoiceMath";

type Breach = { id: string; why: string };

function report(label: string, breaches: Breach[]) {
  if (breaches.length === 0) {
    console.log(`  PASS  ${label}`);
    return 0;
  }
  console.log(`  FAIL  ${label} (${breaches.length})`);
  for (const b of breaches.slice(0, 5)) {
    console.log(`        ${b.id}: ${b.why}`);
  }
  return breaches.length;
}

async function main() {
  let failures = 0;

  const orders = await prisma.order.findMany({
    include: { items: true, invoice: true },
  });
  const invoices = await prisma.invoice.findMany({
    include: { payments: true, returns: true, order: true },
  });
  const ledger = await prisma.stockLedger.findMany({
    orderBy: { createdAt: "asc" },
  });

  failures += report(
    "order.subtotal equals the sum of its line totals",
    orders
      .map((o) => {
        const sum = o.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
        return sum === o.subtotal
          ? null
          : { id: o.code, why: `subtotal ${o.subtotal} != lines ${sum}` };
      })
      .filter(Boolean) as Breach[],
  );

  failures += report(
    "every order has a status from the shared enum",
    orders
      .filter((o) => !ORDER_STATUSES.includes(o.status as OrderStatus))
      .map((o) => ({ id: o.code, why: `status "${o.status}"` })),
  );

  failures += report(
    "invoice.amountPaid equals the sum of its payments",
    invoices
      .filter((i) => i.payments.reduce((s, p) => s + p.amount, 0) !== i.amountPaid)
      .map((i) => ({
        id: i.code,
        why: `amountPaid ${i.amountPaid} != payments ${i.payments.reduce(
          (s, p) => s + p.amount,
          0,
        )}`,
      })),
  );

  failures += report(
    "invoice balance/status match deriveInvoiceState(total, amountPaid)",
    invoices
      .filter((i) => {
        const d = deriveInvoiceState(i.total, i.amountPaid);
        return d.balance !== i.balance || d.paymentStatus !== i.paymentStatus;
      })
      .map((i) => {
        const d = deriveInvoiceState(i.total, i.amountPaid);
        return {
          id: i.code,
          why: `stored ${i.balance}/${i.paymentStatus}, derived ${d.balance}/${d.paymentStatus}`,
        };
      }),
  );

  failures += report(
    "a zero-balance invoice never leaves its order un-settled",
    invoices
      .filter((i) => i.balance === 0 && i.order.status !== "settled")
      .map((i) => ({
        id: i.code,
        why: `paid in full but order is "${i.order.status}"`,
      })),
  );

  failures += report(
    "no settled order carries an unpaid invoice",
    orders
      .filter((o) => o.status === "settled" && (o.invoice?.balance ?? 0) > 0)
      .map((o) => ({
        id: o.code,
        why: `settled with balance ${o.invoice?.balance}`,
      })),
  );

  failures += report(
    "payment modes and invoice payment statuses are enum values",
    [
      ...invoices
        .filter((i) => !PAYMENT_STATUSES.includes(i.paymentStatus as never))
        .map((i) => ({ id: i.code, why: `paymentStatus "${i.paymentStatus}"` })),
      ...invoices
        .flatMap((i) => i.payments.map((p) => ({ code: i.code, mode: p.mode })))
        .filter((p) => !PAYMENT_MODES.includes(p.mode as never))
        .map((p) => ({ id: p.code, why: `payment mode "${p.mode}"` })),
    ],
  );

  failures += report(
    "ledger reasons are enum values (no free-text drift)",
    ledger
      .filter((l) => !STOCK_REASONS.includes(l.reason as never))
      .map((l) => ({ id: l.id, why: `reason "${l.reason}"` })),
  );

  failures += report(
    "ledger deltas are non-zero and signed the right way per reason",
    ledger
      .filter(
        (l) =>
          l.delta === 0 ||
          (l.reason === "sale" && l.delta > 0) ||
          ((l.reason === "return" || l.reason === "purchase") && l.delta < 0),
      )
      .map((l) => ({ id: l.id, why: `reason ${l.reason} with delta ${l.delta}` })),
  );

  // The chain can only be checked from a product's first recorded movement
  // forward: rows created outside the ledger (the original catalogue stock) are
  // not in the feed, so the absolute starting point is unknown by design.
  const perProduct = new Map<string, typeof ledger>();
  for (const l of ledger) {
    const list = perProduct.get(l.productId) ?? [];
    list.push(l);
    perProduct.set(l.productId, list);
  }
  const negatives: Breach[] = [];
  for (const [productId, rows] of perProduct) {
    if (rows.some((r) => r.balanceAfter < 0)) {
      const first = rows.find((r) => r.balanceAfter < 0)!;
      negatives.push({
        id: productId,
        why: `balanceAfter ${first.balanceAfter} at ${first.reason} ${first.createdAt.toISOString()}`,
      });
    }
  }
  failures += report(
    "no product's ledger chain dips below zero",
    negatives,
  );

  // Ownership alignment is enforced for the demo scenario only: legacy rows
  // created before booker scoping existed may legitimately cross, and the
  // service still allows office-initiated bookings on unassigned shops.
  const shops = await prisma.customer.findMany({ include: { orders: true } });
  failures += report(
    "every demo order sits on a shop owned by the same booker",
    shops.flatMap((s) =>
      s.orders
        .filter((o) => o.notes?.includes("seed:v32"))
        .filter((o) => s.bookerId && o.bookerId !== s.bookerId)
        .map((o) => ({
          id: o.code,
          why: `booked by ${o.bookerId} but ${s.name} belongs to ${s.bookerId}`,
        })),
    ),
  );

  const demo = orders.filter((o) => o.notes?.includes("seed:v32"));
  const last7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentDemo = demo.filter((o) => o.createdAt >= last7);
  console.log(
    `\n  demo rows: ${demo.length} tagged orders, ${recentDemo.length} inside the last 7 days, ` +
      `${demo.filter((o) => (o.invoice?.balance ?? 0) > 0).length} still owing`,
  );
  failures += report(
    "demo scenario covers every live pipeline stage the board draws",
    ORDER_STATUSES.filter((s) => !demo.some((o) => o.status === s) && s !== "cancelled")
      .map((s) => ({ id: s, why: "no demo order in this stage" })),
  );

  console.log(
    failures === 0
      ? "\n=== verify-seed: all invariants hold ==="
      : `\n=== verify-seed: ${failures} breach(es) ===`,
  );
  await prisma.$disconnect();
  if (failures > 0) process.exit(1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
