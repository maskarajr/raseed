import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/server/auth/session";
import { ApiError } from "@/server/http";
import { canTransition, type OrderStatus } from "@/lib/enums";
import { nextOrderCode } from "./codes";
import { generateInvoice } from "./invoices";
import { settleOrderIfPaid } from "./settle";

export type OrderItemInput = {
  productId: string;
  qty: number;
  unitPrice: number;
};

export type CreateOrderInput = {
  customerId: string;
  bookerId: string;
  notes?: string;
  items: OrderItemInput[];
  submit: boolean;
  // Cash advance declared at capture (G1). Already zod-guarded to int >= 0;
  // the service enforces the upper bound against the server-summed subtotal.
  advance?: number;
  // Who is driving the create. Office/owner may book any shop on any booker's
  // behalf; a booker is restricted to their own (see the guard below).
  actor?: Pick<SessionUser, "id" | "role">;
};

export type StockWarning = {
  productId: string;
  sku: string;
  name: string;
  requested: number;
  available: number;
};

export async function createOrder(input: CreateOrderInput) {
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({
      where: { id: input.customerId },
    });
    if (!customer) throw new ApiError(404, "Customer not found");

    const booker = await tx.user.findUnique({ where: { id: input.bookerId } });
    if (!booker || booker.role !== "booker") {
      throw new ApiError(400, "Invalid booker for order");
    }

    // Booker scoping on the write path, mirroring the read path: a booker may
    // book their own shops (and unassigned ones, which they then own via the
    // capture flow), never another booker's.
    if (
      input.actor?.role === "booker" &&
      customer.bookerId &&
      customer.bookerId !== input.actor.id
    ) {
      throw new ApiError(403, "Forbidden: shop belongs to another booker");
    }

    if (input.items.length === 0) {
      throw new ApiError(400, "Order must contain at least one item");
    }

    const productIds = input.items.map((i) => i.productId);
    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const warnings: StockWarning[] = [];
    let subtotal = 0;
    for (const item of input.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new ApiError(404, `Product not found: ${item.productId}`);
      }
      if (!product.active) {
        throw new ApiError(400, `Product is inactive: ${product.sku}`);
      }
      subtotal += item.qty * item.unitPrice;
      // Soft, non-blocking stock warning.
      if (item.qty > product.stockQty) {
        warnings.push({
          productId: product.id,
          sku: product.sku,
          name: product.name,
          requested: item.qty,
          available: product.stockQty,
        });
      }
    }

    const code = await nextOrderCode(tx);

    // Advance is declared against the SERVER-summed subtotal, never a client-
    // supplied total. Reject anything above the order value before we persist.
    const advance = input.advance ?? 0;
    if (advance > subtotal) {
      throw new ApiError(
        400,
        `Advance (Rs ${advance}) exceeds order total (Rs ${subtotal})`,
      );
    }

    const order = await tx.order.create({
      data: {
        code,
        bookerId: input.bookerId,
        customerId: input.customerId,
        notes: input.notes,
        status: input.submit ? "submitted" : "draft",
        subtotal,
        advance,
        items: {
          create: input.items.map((i) => ({
            productId: i.productId,
            qty: i.qty,
            unitPrice: i.unitPrice,
          })),
        },
      },
      include: { items: true, customer: true },
    });

    // balanceDue is the collect-on-delivery figure the board's step-3 shows
    // (`.balance` = total − advance). Server-computed so the client never does
    // money math; the real ledger still flows through Invoice on generation.
    return { order, warnings, balanceDue: subtotal - advance };
  });
}

// Draft-only edit (Privy seq211). Replaces items / notes / advance while an
// order is still a draft. This is the ONLY remaining order mutation the draft
// lifecycle needed — Submit/Discard/cancel already exist server-side.
//
// Contract:
// - actor: the owning booker OR office/owner; a foreign/nonexistent id returns
//   the IDENTICAL 404 (Figmi's no-existence-leak rule, same as GET [id]).
// - only status == 'draft' is editable; any later state is rejected (400).
// - items revalidated (qty>0 via schema, product must exist + be active) and
//   subtotal RECOMPUTED server-side; advance re-clamped to <= subtotal.
// - runs in a single $transaction (repo invariant: every order write is atomic).
export type EditDraftInput = {
  items: OrderItemInput[];
  notes?: string;
  advance?: number;
};

export async function editDraftOrder(
  session: SessionUser,
  orderId: string,
  input: EditDraftInput,
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order || (session.role === "booker" && order.bookerId !== session.id)) {
      throw new ApiError(404, "Order not found");
    }
    if (order.status !== "draft") {
      throw new ApiError(
        400,
        `Only draft orders can be edited (current: ${order.status})`,
      );
    }

    const productIds = input.items.map((i) => i.productId);
    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    let subtotal = 0;
    for (const item of input.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new ApiError(404, `Product not found: ${item.productId}`);
      }
      if (!product.active) {
        throw new ApiError(400, `Product is inactive: ${product.sku}`);
      }
      subtotal += item.qty * item.unitPrice;
    }

    // Advance is optional on edit: omit -> keep the current draft's advance.
    const advance = input.advance ?? order.advance;
    if (advance > subtotal) {
      throw new ApiError(
        400,
        `Advance (Rs ${advance}) exceeds order total (Rs ${subtotal})`,
      );
    }

    // Replace the line set wholesale.
    await tx.orderItem.deleteMany({ where: { orderId: order.id } });
    await tx.orderItem.createMany({
      data: input.items.map((i) => ({
        orderId: order.id,
        productId: i.productId,
        qty: i.qty,
        unitPrice: i.unitPrice,
      })),
    });

    return tx.order.update({
      where: { id: order.id },
      data: {
        subtotal,
        advance,
        notes: input.notes ?? order.notes,
      },
      include: { items: { include: { product: { select: { sku: true, name: true } } } }, customer: true },
    });
  });
}

// Enforces valid lifecycle transitions server-side. Does NOT handle the
// invoiced transition (that goes through the invoice service, which also
// deducts stock).
export async function transitionOrder(
  session: SessionUser,
  orderId: string,
  to: OrderStatus,
) {
  if (to === "invoiced") {
    throw new ApiError(
      400,
      "Use the invoice endpoint to invoice an order (it deducts stock)",
    );
  }

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new ApiError(404, "Order not found");

    // Booker scoping: bookers can only touch their own orders.
    if (session.role === "booker" && order.bookerId !== session.id) {
      throw new ApiError(403, "Forbidden");
    }

    const from = order.status as OrderStatus;
    if (!canTransition(from, to)) {
      throw new ApiError(400, `Invalid transition: ${from} -> ${to}`);
    }

    // Role rules for who may drive which transition.
    const officeRoles = session.role === "office" || session.role === "owner";
    if (to === "submitted") {
      // Booker (own) or office may submit a draft.
    } else if (to === "cancelled") {
      if (session.role === "booker" && !["draft", "submitted"].includes(from)) {
        throw new ApiError(403, "Bookers may only cancel draft/submitted orders");
      }
    } else if (!officeRoles) {
      throw new ApiError(403, "Only office/owner may advance this order");
    }

    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: to },
      include: { items: true, customer: true },
    });

    // Physical delivery is the only place deliveredAt is written (G2 print).
    // A prepaid order (advance folded into invoice.amountPaid at invoicing)
    // reaches balance 0 here; settle is driven by the SAME canonical
    // balance-driven path payments/returns use — never a hand-set status and
    // never at invoice-gen — so the audit trail (advance Payment + deliveredAt
    // + settle transition) is complete. An unpaid order stays `delivered`.
    if (to === "delivered") {
      const invoice = await tx.invoice.findUnique({
        where: { orderId },
        select: { id: true, balance: true },
      });
      if (invoice) {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { deliveredAt: new Date() },
        });
        await settleOrderIfPaid(tx, orderId, invoice.balance);
        return tx.order.findUniqueOrThrow({
          where: { id: orderId },
          include: { items: true, customer: true },
        });
      }
    }

    return updated;
  });
}

// ---------------------------------------------------------------------------
// Batch confirm / invoice (owner seq18 'Confirm All' / 'Invoice All').
//
// Deliberately THIN: each id goes through the SAME single-order service, so
// confirm stays one transaction per order and invoice keeps the stock-deduct,
// advance-ledger and balance-settle path exactly as the per-order endpoint
// runs it. No bulk shortcut, no new money logic.
//
// A failure on one id is collected and the loop continues: one already-
// invoiced or foreign id must never abort the rest of the batch, and must
// never surface as a 500.
// ---------------------------------------------------------------------------

export type BatchAction = "confirm" | "invoice";

export type BatchFailure = {
  id: string;
  code: string;
  reason: string;
};

// Machine-readable label per single-order status. The message stays in
// `reason` so the UI can show the server's own wording.
const BATCH_FAILURE_CODES: Record<number, string> = {
  400: "invalid_state",
  403: "forbidden",
  404: "not_found",
  409: "already_invoiced",
};

export async function batchOrderAction(
  session: SessionUser,
  action: BatchAction,
  ids: string[],
) {
  const ok: Awaited<ReturnType<typeof transitionOrder>>[] = [];
  const failed: BatchFailure[] = [];

  for (const id of ids) {
    try {
      if (action === "confirm") {
        ok.push(await transitionOrder(session, id, "confirmed"));
      } else {
        await generateInvoice(session, id);
        // generateInvoice answers with the invoice; the batch contract answers
        // with the order, in the same include shape confirm already returns.
        ok.push(
          await prisma.order.findUniqueOrThrow({
            where: { id },
            include: { items: true, customer: true },
          }),
        );
      }
    } catch (err) {
      if (err instanceof ApiError) {
        failed.push({
          id,
          code: BATCH_FAILURE_CODES[err.status] ?? "invalid_state",
          reason: err.message,
        });
      } else {
        // Anything that is not a service-rejected transition is a real fault:
        // keep it visible in the server log, but hand the client the same
        // neutral reason instead of leaking driver/ORM detail.
        console.error("Batch order unexpected failure:", id, err);
        failed.push({
          id,
          code: "internal_error",
          reason: "Internal error processing this order",
        });
      }
    }
  }

  return { ok, failed };
}
