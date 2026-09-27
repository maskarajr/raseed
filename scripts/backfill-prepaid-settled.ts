/**
 * One-time backfill for Option A (owner seq176).
 *
 * Fully-prepaid orders that were invoiced BEFORE settle-at-invoice shipped are
 * stuck reading 'Invoiced' even though their invoice balance is already 0, so
 * the Orders page shows the wrong terminal state. This drives any order that is
 * in a settleable state (invoiced | out_for_delivery | delivered) whose invoice
 * balance is already 0 -> 'settled', matching what the live generateInvoice /
 * payment paths now do.
 *
 * It is the SAME balance-driven rule as settleOrderIfPaid, applied as a batch:
 *  - status-only change; it never fabricates a deliveredAt or an audit/ledger row.
 *  - idempotent: 'settled' is not in SETTLEABLE_STATUSES, so re-runs are no-ops.
 *  - scoped: only touches rows that already satisfy balance == 0.
 *
 * Usage (Prisma reaches Turso via the app's libsql adapter in .env):
 *   npx tsx scripts/backfill-prepaid-settled.ts          # dry-run (default)
 *   npx tsx scripts/backfill-prepaid-settled.ts --apply  # write
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { SETTLEABLE_STATUSES, type OrderStatus } from "@/lib/enums";

async function main() {
  const apply = process.argv.includes("--apply");

  const targets = await prisma.order.findMany({
    where: {
      status: { in: [...SETTLEABLE_STATUSES] as OrderStatus[] },
      invoice: { is: { balance: 0 } },
    },
    select: {
      id: true,
      code: true,
      status: true,
      subtotal: true,
      advance: true,
      invoice: {
        select: { code: true, balance: true, paymentStatus: true },
      },
    },
    orderBy: { code: "asc" },
  });

  console.log(
    `[backfill] ${targets.length} order(s) in a settleable state with invoice balance 0`,
  );
  for (const o of targets) {
    console.log(
      `  ${o.code}  status=${o.status}  subtotal=${o.subtotal}  advance=${o.advance}  invoice=${o.invoice?.code} balance=${o.invoice?.balance} ${o.invoice?.paymentStatus}`,
    );
  }

  if (!apply) {
    console.log(
      "[backfill] DRY RUN — pass --apply to settle these. No rows changed.",
    );
    return;
  }
  if (targets.length === 0) {
    console.log("[backfill] nothing to do.");
    return;
  }

  const result = await prisma.order.updateMany({
    where: {
      id: { in: targets.map((t) => t.id) },
      // Re-assert the guard inside the write so a concurrent change can't be
      // clobbered into a wrong terminal state.
      status: { in: [...SETTLEABLE_STATUSES] as OrderStatus[] },
      invoice: { is: { balance: 0 } },
    },
    data: { status: "settled" },
  });
  console.log(`[backfill] applied — ${result.count} order(s) -> settled.`);
}

main()
  .catch((err) => {
    console.error("[backfill] failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
