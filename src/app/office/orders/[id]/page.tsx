"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { StatusPill } from "@/components/badges";
import { OfficeChrome } from "@/components/OfficeChrome";
import { initials } from "@/lib/person";
import { SideSheet } from "@/components/SideSheet";
import { useToast } from "@/components/Toast";
import { stockTone } from "@/lib/status";

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
    product: {
      sku: string;
      name: string;
      unit: string;
      stockQty: number;
      reorderLevel: number | null;
    };
  }[];
  invoice: {
    id: string;
    code: string;
    paymentStatus: string;
    balance: number;
  } | null;
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
  const toast = useToast();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reassign, setReassign] = useState(false);
  const [bookers, setBookers] = useState<{ id: string; name: string }[]>([]);

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
    api<{ bookers: { id: string; name: string }[] }>("/api/bookers")
      .then((d) => setBookers(d.bookers))
      .catch(() => undefined);
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
      kicker={`Orders / ${order.code}`}
      status={
        <>
          <StatusPill status={order.status} />
          {order.invoice ? (
            <StatusPill status={order.invoice.paymentStatus} />
          ) : null}
        </>
      }
      actions={
        <>
          <button
            type="button"
            className="btn-ghost"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const { order: copy } = await api<{ order: { id: string; code: string } }>(
                  `/api/orders/${order.id}/duplicate`,
                  { method: "POST" },
                );
                toast(`Order duplicated as ${copy.code}`);
                router.push(`/office/orders/${copy.id}`);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Duplicate failed");
                setBusy(false);
              }
            }}
          >
            Duplicate
          </button>
          <button
            type="button"
            className="btn-sec"
            onClick={() => setReassign(true)}
          >
            Reassign booker
          </button>
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
          {order.invoice && order.invoice.balance > 0 ? (
            <Link
              href={`/office/invoices/${order.invoice.id}`}
              className="btn-primary"
            >
              Collect payment
            </Link>
          ) : null}
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
              <dd>
                {order.invoice?.paymentStatus === "paid"
                  ? "Collected"
                  : "Cash on delivery"}
              </dd>
            </div>
          </dl>
        </div>
        <div className="card2 stack" style={{ width: 250 }}>
          <p className="ptitle-s">Timeline</p>
          <div className="timeline">
            <div className="tl-item">
              <span className="tl-dot done" />
              <div>
                <p className="pname">Captured</p>
                <p className="pmeta">
                  {placedLabel(order.createdAt)} · {order.booker.name}
                </p>
              </div>
            </div>
            <div className="tl-item">
              <span
                className={`tl-dot${["confirmed", "invoiced", "out_for_delivery", "delivered", "settled"].includes(order.status) ? " done" : ""}`}
              />
              <div>
                <p className="pname">Confirmed</p>
                <p className="pmeta">office review</p>
              </div>
            </div>
            <div className="tl-item">
              <span
                className={`tl-dot${["invoiced", "out_for_delivery", "delivered", "settled"].includes(order.status) ? " done" : ""}`}
              />
              <div>
                <p className="pname">Invoiced</p>
                <p className="pmeta">stock deducted</p>
              </div>
            </div>
          </div>
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
        <table className="tbl store">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product</th>
              <th className="r">Qty</th>
              <th className="r">Rate</th>
              <th className="r">Amount</th>
              <th>Stock</th>
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
                <td>
                  <StatusPill
                    status={stockTone(i.product.stockQty, i.product.reorderLevel).label}
                  />
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
      {reassign && (
        <SideSheet title="Reassign booker" onClose={() => setReassign(false)}>
          <div className="stack">
            {bookers.map((b) => (
              <button
                key={b.id}
                type="button"
                className={`opt${b.id === order.booker.id ? " is-on" : ""}`}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await api(`/api/orders/${order.id}/reassign`, {
                      method: "POST",
                      body: JSON.stringify({ bookerId: b.id }),
                    });
                    toast(`Reassigned to ${b.name}`);
                    setReassign(false);
                    load();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Reassign failed");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {b.name}
              </button>
            ))}
          </div>
        </SideSheet>
      )}
    </OfficeChrome>
  );
}
