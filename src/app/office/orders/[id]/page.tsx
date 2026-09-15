"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { StatusPill } from "@/components/badges";
import { OfficeChrome } from "@/components/OfficeChrome";

type OrderDetail = {
  id: string;
  code: string;
  status: string;
  notes: string | null;
  subtotal: number;
  createdAt: string;
  customer: { name: string; phone: string; area: string | null; address: string | null };
  booker: { id: string; name: string };
  items: {
    id: string;
    qty: number;
    unitPrice: number;
    product: { sku: string; name: string; unit: string };
  }[];
  invoice: { id: string; code: string } | null;
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const { order } = await api<{ order: OrderDetail }>(`/api/orders/${id}`);
      setOrder(order);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function act(path: string, body?: object) {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ invoice?: { id: string } }>(path, {
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
      });
      if (path.endsWith("/invoice") && res.invoice) {
        router.push(`/office/invoices/${res.invoice.id}`);
        return;
      }
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  if (error && !order) {
    return (
      <OfficeChrome title="Order">
        <p className="muted">{error}</p>
      </OfficeChrome>
    );
  }
  if (!order) {
    return (
      <OfficeChrome title="Order">
        <p className="muted">Loading…</p>
      </OfficeChrome>
    );
  }

  return (
    <OfficeChrome
      title={order.code}
      subtitle={`Orders / ${order.code}`}
      actions={
        <>
          <StatusPill status={order.status} />
          {order.status === "submitted" && (
            <button
              className="btn-primary"
              disabled={busy}
              onClick={() => act(`/api/orders/${order.id}/confirm`)}
            >
              Confirm order
            </button>
          )}
          {order.status === "confirmed" && (
            <button
              className="btn-primary"
              disabled={busy}
              onClick={() => act(`/api/orders/${order.id}/invoice`)}
            >
              Generate invoice
            </button>
          )}
        </>
      }
    >
      {error && <p className="muted">{error}</p>}

      <div className="row" style={{ alignItems: "flex-start" }}>
        <div className="card2 grow">
          <h2 className="h3s" style={{ marginBottom: 12 }}>
            Line items
          </h2>
          <table className="tbl">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Unit price</th>
                <th className="text-right">Line</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((i) => (
                <tr key={i.id}>
                  <td className="font-mono text-xs">{i.product.sku}</td>
                  <td>{i.product.name}</td>
                  <td className="tnum text-right">
                    {i.qty} {i.product.unit}
                  </td>
                  <td className="text-right">
                    <Money value={i.unitPrice} />
                  </td>
                  <td className="text-right">
                    <Money value={i.qty * i.unitPrice} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="text-right font-semibold">
                  Subtotal
                </td>
                <td className="text-right font-semibold">
                  <Money value={order.subtotal} />
                </td>
              </tr>
            </tfoot>
          </table>
          {order.notes && (
            <p className="mt-3 text-sm text-muted">Notes: {order.notes}</p>
          )}
        </div>

        <div className="stack" style={{ width: 280 }}>
          <div className="card2">
            <h2 className="h3s" style={{ marginBottom: 8 }}>
              Customer
            </h2>
            <p className="font-medium">{order.customer.name}</p>
            <p className="text-sm text-muted">{order.customer.phone}</p>
            <p className="text-sm text-muted">
              {order.customer.area ?? ""} {order.customer.address ?? ""}
            </p>
            <p className="mt-2 text-sm text-muted">Booker: {order.booker.name}</p>
          </div>

          <div className="card2 stack">
            <h2 className="h3s">Actions</h2>
            {order.status === "submitted" && (
              <button
                className="btn-primary w-full"
                disabled={busy}
                onClick={() => act(`/api/orders/${order.id}/confirm`)}
              >
                Confirm order
              </button>
            )}
            {order.status === "confirmed" && (
              <button
                className="btn-primary w-full"
                disabled={busy}
                onClick={() => act(`/api/orders/${order.id}/invoice`)}
              >
                Generate invoice (deduct stock)
              </button>
            )}
            {order.status === "invoiced" && (
              <button
                className="btn-sec btn-block"
                disabled={busy}
                onClick={() =>
                  act(`/api/orders/${order.id}/status`, {
                    status: "out_for_delivery",
                  })
                }
              >
                Mark out for delivery
              </button>
            )}
            {order.status === "out_for_delivery" && (
              <button
                className="btn-sec btn-block"
                disabled={busy}
                onClick={() =>
                  act(`/api/orders/${order.id}/status`, { status: "delivered" })
                }
              >
                Mark delivered
              </button>
            )}
            {order.invoice && (
              <Link
                href={`/office/invoices/${order.invoice.id}`}
                className="btn-sec btn-block"
              >
                Open invoice {order.invoice.code}
              </Link>
            )}
            {order.invoice && order.status !== "settled" && (
              <p className="text-xs text-muted">
                Order settles automatically once the invoice balance reaches
                Rs 0.
              </p>
            )}
            {["draft", "submitted", "confirmed"].includes(order.status) && (
              <button
                className="btn-sec btn-block"
                disabled={busy}
                onClick={() => act(`/api/orders/${order.id}/cancel`)}
              >
                Cancel order
              </button>
            )}
          </div>
        </div>
      </div>
    </OfficeChrome>
  );
}
