"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { StatusPill } from "@/components/badges";

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

  if (error && !order) return <p className="text-danger">{error}</p>;
  if (!order) return <p className="text-muted">Loading…</p>;

  return (
    <div className="space-y-4">
      <div>
        <Link href="/office/orders" className="text-sm text-primary">
          ← Orders
        </Link>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold">
          {order.code} <StatusPill status={order.status} />
        </h1>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-3 font-semibold">Items</h2>
          <table className="table">
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

        <div className="space-y-4">
          <div className="card">
            <h2 className="mb-2 font-semibold">Customer</h2>
            <p className="font-medium">{order.customer.name}</p>
            <p className="text-sm text-muted">{order.customer.phone}</p>
            <p className="text-sm text-muted">
              {order.customer.area ?? ""} {order.customer.address ?? ""}
            </p>
            <p className="mt-2 text-sm text-muted">Booker: {order.booker.name}</p>
          </div>

          <div className="card space-y-2">
            <h2 className="font-semibold">Actions</h2>
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
                className="btn-secondary w-full"
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
                className="btn-secondary w-full"
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
                className="btn-secondary w-full"
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
                className="btn-danger w-full"
                disabled={busy}
                onClick={() => act(`/api/orders/${order.id}/cancel`)}
              >
                Cancel order
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
