import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/server/auth/session";
import { ApiError } from "@/server/http";
import type { PaymentKind, PaymentMode } from "@/lib/enums";
import { deriveInvoiceState } from "./invoiceMath";
import { settleOrderIfPaid } from "./settle";

export type RecordPaymentInput = {
  invoiceId: string;
  amount: number;
  mode: PaymentMode;
  kind?: PaymentKind;
};

export async function recordPayment(
  session: SessionUser,
  input: RecordPaymentInput,
) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: input.invoiceId },
      include: { order: { select: { bookerId: true } } },
    });
    if (!invoice) throw new ApiError(404, "Invoice not found");

    if (session.role === "booker" && invoice.order.bookerId !== session.id) {
      throw new ApiError(403, "Forbidden");
    }

    const kind = input.kind ?? "part";
    let amount = input.amount;
    if (kind === "full") amount = invoice.balance;
    if (amount < 1) throw new ApiError(400, "Amount must be at least Rs 1");
    if (amount > invoice.balance) {
      throw new ApiError(
        400,
        `Payment ${amount} exceeds outstanding balance ${invoice.balance}`,
      );
    }

    const newAmountPaid = invoice.amountPaid + amount;
    const { balance, paymentStatus } = deriveInvoiceState(
      invoice.total,
      newAmountPaid,
    );

    const payment = await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        amount,
        mode: input.mode,
        kind,
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
