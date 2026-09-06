import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/server/auth/session";
import { ApiError } from "@/server/http";
import { applyStockMovement } from "./stock";
import { deriveInvoiceState } from "./invoiceMath";

export type LogReturnInput = {
  invoiceId: string;
  productId: string;
  qty: number;
};

// Office logs a return of productId+qty against an invoice:
//  - restocks the product via the stock service (reason `return`)
//  - reduces invoice total/balance and recomputes paymentStatus
//  - records a Return row
// All in one transaction.
export async function logReturn(session: SessionUser, input: LogReturnInput) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: input.invoiceId },
      include: { order: { include: { items: true } }, returns: true },
    });
    if (!invoice) throw new ApiError(404, "Invoice not found");

    const orderItem = invoice.order.items.find(
      (i) => i.productId === input.productId,
    );
    if (!orderItem) {
      throw new ApiError(400, "Product was not part of this invoice's order");
    }

    const alreadyReturned = invoice.returns
      .filter((r) => r.productId === input.productId)
      .reduce((sum, r) => sum + r.qty, 0);
    const returnable = orderItem.qty - alreadyReturned;
    if (input.qty > returnable) {
      throw new ApiError(
        400,
        `Cannot return ${input.qty}; only ${returnable} returnable for this product`,
      );
    }

    const amount = input.qty * orderItem.unitPrice;

    // Restock via the stock service.
    await applyStockMovement(tx, {
      productId: input.productId,
      delta: input.qty,
      reason: "return",
      createdBy: session.id,
      refType: "invoice",
      refId: invoice.id,
    });

    const newTotal = invoice.total - amount;
    const { balance, paymentStatus } = deriveInvoiceState(
      newTotal,
      invoice.amountPaid,
    );

    const updatedInvoice = await tx.invoice.update({
      where: { id: invoice.id },
      data: { total: newTotal, balance, paymentStatus },
    });

    const returnRow = await tx.return.create({
      data: {
        invoiceId: invoice.id,
        productId: input.productId,
        qty: input.qty,
        amount,
        createdBy: session.id,
      },
    });

    return { invoice: updatedInvoice, return: returnRow };
  });
}
