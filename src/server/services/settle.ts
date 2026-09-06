import { Prisma } from "@prisma/client";
import { SETTLEABLE_STATUSES, type OrderStatus } from "@/lib/enums";

// Drive the order to `settled` the moment its invoice balance reaches 0.
// Settlement is balance-driven (via payments or balance-reducing returns), not
// a manual transition. Only fires from a valid post-invoice state so the single
// status machine stays consistent; never resurrects a cancelled order.
export async function settleOrderIfPaid(
  tx: Prisma.TransactionClient,
  orderId: string,
  balance: number,
): Promise<void> {
  if (balance !== 0) return;
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  });
  if (!order) return;
  if (!SETTLEABLE_STATUSES.includes(order.status as OrderStatus)) return;
  await tx.order.update({
    where: { id: orderId },
    data: { status: "settled" },
  });
}
