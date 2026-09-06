import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/server/auth/session";
import { ApiError } from "@/server/http";
import type { PaymentMode } from "@/lib/enums";
import { deriveInvoiceState } from "./invoiceMath";

export type RecordPaymentInput = {
  invoiceId: string;
  amount: number;
  mode: PaymentMode;
};

// Record a payment against an invoice and update amountPaid/balance/status.
// Credit sales are allowed (an unpaid/partial balance may remain), but a single
// payment cannot exceed the outstanding balance.
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

    return { invoice: updatedInvoice, payment };
  });
}
