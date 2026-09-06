import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/server/auth/session";
import { ApiError } from "@/server/http";
import { canTransition, type OrderStatus } from "@/lib/enums";
import { nextOrderCode } from "./codes";

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
    const order = await tx.order.create({
      data: {
        code,
        bookerId: input.bookerId,
        customerId: input.customerId,
        notes: input.notes,
        status: input.submit ? "submitted" : "draft",
        subtotal,
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

    return { order, warnings };
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

    return tx.order.update({
      where: { id: orderId },
      data: { status: to },
      include: { items: true, customer: true },
    });
  });
}
