"use client";

import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { StatusPill } from "@/components/badges";
import { DocumentSheet } from "@/components/DocumentSheet";
import { InvoiceDocument } from "@/components/InvoiceDocument";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/enums";

type OrderDetail = {
  id: string;
  code: string;
  status: string;
  notes: string | null;
  subtotal: number;
  createdAt: string;
  customer: {
    name: string;
    phone: string;
    area: string | null;
    address: string | null;
  };
  booker: { id: string; name: string };
  items: {
    id: string;
    qty: number;
    unitPrice: number;
    product: { sku: string; name: string; unit: string };
  }[];
  invoice: { id: string; code: string } | null;
};

function asOrderStatus(status: string): OrderStatus | null {
  return (ORDER_STATUSES as readonly string[]).includes(status)
    ? (status as OrderStatus)
    : null;
}

export function OrderDocument({
  orderId,
  onClose,
}: {
  orderId: string;
  onClose: () => void;
}) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);

  async function load() {
    try {
      const { order } = await api<{ order: OrderDetail }>(
        `/api/orders/${orderId}`,
      );
      setOrder(order);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  async function act(path: string, body?: object) {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ invoice?: { id: string } }>(path, {
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
      });
      if (path.endsWith("/invoice") && res.invoice) {
        setInvoiceId(res.invoice.id);
        return;
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  if (invoiceId) {
    return (
      <InvoiceDocument
        invoiceId={invoiceId}
        onClose={() => {
          setInvoiceId(null);
          onClose();
        }}
      />
    );
  }

  if (error && !order) {
    return (
      <DocumentSheet title="Order" onClose={onClose}>
        <p className="text-danger">{error}</p>
      </DocumentSheet>
    );
  }
  if (!order) {
    return (
      <DocumentSheet title="Order" onClose={onClose}>
        <p className="text-muted">Loading…</p>
      </DocumentSheet>
    );
  }

  const status = asOrderStatus(order.status);

  return (
    <DocumentSheet
      title={order.code}
      subtitle={
        <span className="inline-flex items-center gap-2">
          <StatusPill status={order.status} />
          {order.customer.name}
        </span>
      }
      onClose={onClose}
      footer={
        <OrderActions
          order={order}
          busy={busy}
          onAct={act}
          status={status}
          onOpenInvoice={(id) => setInvoiceId(id)}
        />
      }
    >
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}
      <div className="border border-line bg-surface p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Shop</p>
            <p className="font-medium">{order.customer.name}</p>
            <p className="text-sm text-muted">{order.customer.phone}</p>
            <p className="text-sm text-muted">
              {order.customer.area ?? ""} {order.customer.address ?? ""}
            </p>
            <p className="mt-2 text-sm text-muted">Booker: {order.booker.name}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-muted">Total</p>
            <p className="font-serif text-3xl font-semibold">
              <Money value={order.subtotal} />
            </p>
          </div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Desc</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Unit Rs</th>
              <th className="text-right">Line Rs</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={i.id}>
                <td className="font-mono text-xs">{i.product.sku}</td>
                <td>{i.product.name}</td>
                <td className="tnum text-right font-mono">
                  {i.qty} {i.product.unit}
                </td>
                <td className="text-right font-mono">
                  <Money value={i.unitPrice} />
                </td>
                <td className="text-right font-mono">
                  <Money value={i.qty * i.unitPrice} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {order.notes && (
          <p className="mt-3 text-sm text-muted">Notes: {order.notes}</p>
        )}
      </div>
    </DocumentSheet>
  );
}

function OrderActions({
  order,
  status,
  busy,
  onAct,
  onOpenInvoice,
}: {
  order: OrderDetail;
  status: OrderStatus | null;
  busy: boolean;
  onAct: (path: string, body?: object) => void;
  onOpenInvoice: (id: string) => void;
}) {
  if (!status) return null;

  const canCancel =
    status === "draft" || status === "submitted" || status === "confirmed";

  let primary: ReactNode = null;
  switch (status) {
    case "submitted":
      primary = (
        <button
          className="btn-primary"
          disabled={busy}
          onClick={() => onAct(`/api/orders/${order.id}/confirm`)}
        >
          Confirm order
        </button>
      );
      break;
    case "confirmed":
      primary = (
        <button
          className="btn-primary"
          disabled={busy}
          onClick={() => onAct(`/api/orders/${order.id}/invoice`)}
        >
          Generate invoice
        </button>
      );
      break;
    case "invoiced":
      primary = (
        <button
          className="btn-secondary"
          disabled={busy}
          onClick={() =>
            onAct(`/api/orders/${order.id}/status`, {
              status: "out_for_delivery",
            })
          }
        >
          Mark out for delivery
        </button>
      );
      break;
    case "out_for_delivery":
      primary = (
        <button
          className="btn-secondary"
          disabled={busy}
          onClick={() =>
            onAct(`/api/orders/${order.id}/status`, { status: "delivered" })
          }
        >
          Mark delivered
        </button>
      );
      break;
    case "draft":
    case "delivered":
    case "settled":
    case "cancelled":
      primary = null;
      break;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }

  return (
    <>
      {primary}
      {order.invoice && (
        <button
          className="btn-secondary"
          type="button"
          onClick={() => onOpenInvoice(order.invoice!.id)}
        >
          Open invoice
        </button>
      )}
      {canCancel && (
        <button
          className="btn-danger"
          disabled={busy}
          onClick={() => onAct(`/api/orders/${order.id}/cancel`)}
        >
          Cancel order
        </button>
      )}
    </>
  );
}
