import type { PaymentStatus } from "@/lib/enums";

// Given an invoice total and amount paid, derive balance + payment status.
export function deriveInvoiceState(
  total: number,
  amountPaid: number,
): { balance: number; paymentStatus: PaymentStatus } {
  const balance = Math.max(total - amountPaid, 0);
  let paymentStatus: PaymentStatus;
  if (balance <= 0) {
    paymentStatus = "paid";
  } else if (amountPaid > 0) {
    paymentStatus = "partial";
  } else {
    paymentStatus = "unpaid";
  }
  return { balance, paymentStatus };
}
