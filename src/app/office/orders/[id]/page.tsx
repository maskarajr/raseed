"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { StatusPill } from "@/components/badges";
import { OfficeChrome } from "@/components/OfficeChrome";
import { initials } from "@/lib/person";

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

function placedLabel(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Karachi",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const { order: row } = await api<{ order: OrderDetail }>(
        `/api/orders/${id}`,
      );
      setOrder(row);
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
          {order.invoice && (
            <Link
              href={`/office/invoices/${order.invoice.id}`}
              className="btn-sec"
            >
              Invoice {order.invoice.code}
            </Link>
          )}
        </>
      }
    >
      {error && <p className="muted">{error}</p>}

      <div className="row" style={{ gap: 16, alignItems: "stretch" }}>
        <div className="card2" style={{ flex: 1 }}>
          <p className="ptitle-s" style={{ marginBottom: 10 }}>
            Customer
          </p>
          <div className="person">
            <span className="avatar">{initials(order.customer.name)}</span>
            <span>
              <span className="pname">{order.customer.name}</span>
              <br />
              <span className="pmeta">
                {order.customer.area ?? "—"}
                {order.customer.phone ? ` · ${order.customer.phone}` : ""}
              </span>
            </span>
          </div>
          <dl className="dl" style={{ marginTop: 14 }}>
            <div>
              <dt>Booker</dt>
              <dd>{order.booker.name}</dd>
            </div>
            <div>
              <dt>Placed</dt>
              <dd className="num">{placedLabel(order.createdAt)}</dd>
            </div>
            <div>
              <dt>Fulfilment</dt>
              <dd>Cash on delivery</dd>
            </div>
          </dl>
        </div>
        <div className="card2 stack" style={{ width: 250 }}>
          <p className="ptitle-s">Actions</p>
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

      <div className="card2 grow">
        <div className="card2-h">
          <h2 className="h3s">Line items</h2>
          <span className="meta">{order.items.length} lines</span>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product</th>
              <th className="r">Qty</th>
              <th className="r">Rate</th>
              <th className="r">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={i.id}>
                <td className="sku">{i.product.sku}</td>
                <td>{i.product.name}</td>
                <td className="r num">
                  {i.qty} {i.product.unit}
                </td>
                <td className="money">
                  <Money value={i.unitPrice} />
                </td>
                <td className="money">
                  <Money value={i.qty * i.unitPrice} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="totals" style={{ marginTop: 14 }}>
          <div className="trow grand">
            <span>Total</span>
            <span className="num">
              <Money value={order.subtotal} />
            </span>
          </div>
        </div>
        {order.notes ? <p className="meta">Notes: {order.notes}</p> : null}
      </div>
    </OfficeChrome>
  );
}
