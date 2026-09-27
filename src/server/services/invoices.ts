import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/server/auth/session";
import { ApiError } from "@/server/http";
import { applyStockMovement } from "./stock";
import { deriveInvoiceState } from "./invoiceMath";
import { nextInvoiceCode } from "./codes";

// Generate an invoice from a confirmed order. Creates the invoice, moves the
// order to `invoiced`, and deducts stock via the stock service (reason
// `sale`) — all in one transaction.
export async function generateInvoice(session: SessionUser, orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true, invoice: true },
    });
    if (!order) throw new ApiError(404, "Order not found");
    if (order.invoice) throw new ApiError(409, "Order already invoiced");
    if (order.status !== "confirmed") {
      throw new ApiError(
        400,
        `Only confirmed orders can be invoiced (current: ${order.status})`,
      );
    }

    const total = order.subtotal;
    // A cash advance declared at capture is real money already collected, so
    // the invoice opens with amountPaid seeded from it (G1). balance and
    // paymentStatus are then derived from that paid figure, NOT from 0 — a
    // fully-prepaid order lands balance 0 / status paid while still sitting in
    // `invoiced` (it settles later, only when the office confirms physical
    // delivery via the delivered transition — see services/orders.ts).
    const advance = order.advance;
    const { balance, paymentStatus } = deriveInvoiceState(total, advance);
    const code = await nextInvoiceCode(tx);

    const invoice = await tx.invoice.create({
      data: {
        code,
        orderId: order.id,
        customerId: order.customerId,
        total,
        amountPaid: advance,
        balance,
        paymentStatus,
      },
    });

    // One audit Payment row for the advance so the ledger agrees with the
    // seeded amountPaid and reporting on collected-by-kind stays truthful.
    if (advance > 0) {
      await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: advance,
          mode: "cash",
          kind: "advance",
          createdBy: order.bookerId,
        },
      });
    }

    // Deduct stock for each line via the stock service.
    for (const item of order.items) {
      await applyStockMovement(tx, {
        productId: item.productId,
        delta: -item.qty,
        reason: "sale",
        createdBy: session.id,
        refType: "invoice",
        refId: invoice.id,
      });
    }

    await tx.order.update({
      where: { id: order.id },
      data: { status: "invoiced" },
    });

    // Deliberately NO settleOrderIfPaid here: a prepaid order must remain
    // `invoiced` until physical delivery is confirmed (Privy, seq follow-up).
    return invoice;
  });
}
