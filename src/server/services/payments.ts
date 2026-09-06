import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/server/auth/session";
import { ApiError } from "@/server/http";
import type { PaymentMode } from "@/lib/enums";
import { deriveInvoiceState } from "./invoiceMath";
import { settleOrderIfPaid } from "./settle";

export type RecordPaymentInput = {
  invoiceId: string;
  amount: number;
  mode: PaymentMode;
};

// Record a payment against an invoice and update amountPaid/balance/status.
// Partial payments are allowed and leaving a balance unpaid is valid (the
// balance-due figure is itself the credit signal). A single payment cannot
// exceed the outstanding balance. When the balance reaches 0 the order is
// auto-settled.
export async function recordPayment(
  session: SessionUser,
  input: RecordPaymentInput,
) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: input.invoiceId },
    });
    if (!invoice) throw new ApiError(404, "Invoice not found");

    if (input.amount > invoice.balance) {
      throw new ApiError(
        400,
        `Payment ${input.amount} exceeds outstanding balance ${invoice.balance}`,
      );
    }

    const newAmountPaid = invoice.amountPaid + input.amount;
    const { balance, paymentStatus } = deriveInvoiceState(
      invoice.total,
      newAmountPaid,
    );

    const payment = await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: input.amount,
        mode: input.mode,
        createdBy: session.id,
      },
    });

    const updatedInvoice = await tx.invoice.update({
      where: { id: invoice.id },
      data: { amountPaid: newAmountPaid, balance, paymentStatus },
    });

    await settleOrderIfPaid(tx, invoice.orderId, balance);
    const order = await tx.order.findUnique({
      where: { id: invoice.orderId },
      select: { id: true, status: true },
    });

    return { invoice: updatedInvoice, payment, order };
  });
}
