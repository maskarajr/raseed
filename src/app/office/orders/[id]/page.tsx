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
import { SkelDetail } from "@/components/skeletons";
import { useToast } from "@/components/Toast";
import { stockTone, methodLabel } from "@/lib/status";
import {
  busyStart,
  busyEnd,
  lockButtonWidth,
  useBusyLong,
} from "@/lib/busy";

type OrderDetail = {
  id: string;
  code: string;
  status: string;
  notes: string | null;
  subtotal: number;
  advance?: number;
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
    // F3: the GET route already ships the full invoice row (invoice: true);
    // declaring them here lets the Payment chip read the invoice table.
    total: number;
    amountPaid: number;
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
  // Spec D §3: which mutation is in flight — only that button gets the
  // is-busy look; the rest stay plain-disabled.
  const [busyPath, setBusyPath] = useState<string | null>(null);
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

  async function act(
    path: string,
    body?: object,
    key?: string,
    el?: HTMLElement,
  ) {
    const t0 = busyStart();
    lockButtonWidth(el ?? null);
    setBusy(true);
    setBusyPath(key ?? path);
    setError(null);
    try {
      const res = await api<{ invoice?: { id: string } }>(path, {
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
      });
      if (path.endsWith("/invoice") && res.invoice) {
        await busyEnd(t0);
        setBusy(false);
        setBusyPath(null);
        router.push(`/office/invoices/${res.invoice.id}`);
        return;
      }
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      await busyEnd(t0);
      setBusy(false);
      setBusyPath(null);
    }
  }

  const isB = (p: string) => busy && busyPath === p;
  const long = useBusyLong(busy);
  /* §5: present-continuous label, then "Still working…" past 4s — box never
     resizes because min-width was locked pre-press. */
  const bLabel = (p: string, working: string, idle: string) =>
    isB(p) ? (long ? "Still working…" : working) : idle;

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
        <SkelDetail noun="order" />
      </OfficeChrome>
    );
  }

  return (
    <OfficeChrome
      title={order.code}
      kicker={`Orders / ${order.code}`}
      status={<StatusPill status={order.status} />}
      actions={
        <>
          <button
            type="button"
            className={`btn-ghost${isB("duplicate") ? " is-busy" : ""}`}
            disabled={busy}
            aria-disabled={busy || undefined}
            aria-busy={isB("duplicate") || undefined}
            onClick={async (e) => {
              const t0 = busyStart();
              lockButtonWidth(e.currentTarget);
              setBusy(true);
              setBusyPath("duplicate");
              try {
                const { order: copy } = await api<{ order: { id: string; code: string } }>(
                  `/api/orders/${order.id}/duplicate`,
                  { method: "POST" },
                );
                await busyEnd(t0);
                toast(`Order duplicated as ${copy.code}`);
                router.push(`/office/orders/${copy.id}`);
              } catch (e2) {
                setError(e2 instanceof Error ? e2.message : "Duplicate failed");
              } finally {
                await busyEnd(t0);
                setBusy(false);
                setBusyPath(null);
              }
            }}
          >
            {isB("duplicate") && <span className="btn-spin" />}
            {bLabel("duplicate", "Duplicating…", "Duplicate")}
          </button>
          <button
            type="button"
            className="btn-sec"
            onClick={() => setReassign(true)}
          >
            Reassign booker
          </button>
          {order.status === "draft" && (
            <button
              className={`btn-primary${isB(`/api/orders/${order.id}/submit`) ? " is-busy" : ""}`}
              disabled={busy}
              aria-disabled={busy || undefined}
              aria-busy={isB(`/api/orders/${order.id}/submit`) || undefined}
              onClick={(e) =>
                act(`/api/orders/${order.id}/submit`, undefined, undefined, e.currentTarget)
              }
            >
              {isB(`/api/orders/${order.id}/submit`) && <span className="btn-spin" />}
              {bLabel(`/api/orders/${order.id}/submit`, "Submitting…", "Submit")}
            </button>
          )}
          {order.status === "submitted" && (
            <button
              className={`btn-primary${isB(`/api/orders/${order.id}/confirm`) ? " is-busy" : ""}`}
              disabled={busy}
              aria-disabled={busy || undefined}
              aria-busy={isB(`/api/orders/${order.id}/confirm`) || undefined}
              onClick={(e) =>
                act(`/api/orders/${order.id}/confirm`, undefined, undefined, e.currentTarget)
              }
            >
              {isB(`/api/orders/${order.id}/confirm`) && <span className="btn-spin" />}
              {bLabel(`/api/orders/${order.id}/confirm`, "Confirming…", "Confirm order")}
            </button>
          )}
          {order.status === "confirmed" && (
            <button
              className={`btn-primary${isB(`/api/orders/${order.id}/invoice`) ? " is-busy" : ""}`}
              disabled={busy}
              aria-disabled={busy || undefined}
              aria-busy={isB(`/api/orders/${order.id}/invoice`) || undefined}
              onClick={(e) =>
                act(`/api/orders/${order.id}/invoice`, undefined, undefined, e.currentTarget)
              }
            >
              {isB(`/api/orders/${order.id}/invoice`) && <span className="btn-spin" />}
              {bLabel(`/api/orders/${order.id}/invoice`, "Generating invoice…", "Generate invoice")}
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
              {/* R4: money state on the office side is a LABELED chip of METHOD
                  words only (Figmi seq265 four-state), never a second bare
                  header pill; amounts live in the invoice rows/buttons. */}
              <dt>Payment</dt>
              <dd>
                {(() => {
                  // No invoice => nothing collected yet; the whole subtotal is
                  // still due. Prepaid drafts/confirmed orders must not read
                  // bare 'Cash on delivery' (Privy seq276 nitfix) — same
                  // methodLabel decides every case.
                  const m = order.invoice
                    ? methodLabel(
                        order.advance ?? 0,
                        order.invoice.total,
                        order.invoice.amountPaid,
                      )
                    : methodLabel(order.advance ?? 0, order.subtotal, 0);
                  return <StatusPill label={m.label} tone={m.tone} />;
                })()}
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
              className={`btn-sec btn-block${isB("status-ofd") ? " is-busy" : ""}`}
              disabled={busy}
              aria-disabled={busy || undefined}
              aria-busy={isB("status-ofd") || undefined}
              onClick={(e) =>
                act(
                  `/api/orders/${order.id}/status`,
                  { status: "out_for_delivery" },
                  "status-ofd",
                  e.currentTarget,
                )
              }
            >
              {isB("status-ofd") && <span className="btn-spin" />}
              {bLabel("status-ofd", "Marking…", "Mark out for delivery")}
            </button>
          )}
          {order.status === "out_for_delivery" && (
            <button
              className={`btn-sec btn-block${isB("status-del") ? " is-busy" : ""}`}
              disabled={busy}
              aria-disabled={busy || undefined}
              aria-busy={isB("status-del") || undefined}
              onClick={(e) =>
                act(
                  `/api/orders/${order.id}/status`,
                  { status: "delivered" },
                  "status-del",
                  e.currentTarget,
                )
              }
            >
              {isB("status-del") && <span className="btn-spin" />}
              {bLabel("status-del", "Marking…", "Mark delivered")}
            </button>
          )}
          {["draft", "submitted", "confirmed"].includes(order.status) && (
            <button
              className={`btn-sec btn-block${isB(`/api/orders/${order.id}/cancel`) ? " is-busy" : ""}`}
              disabled={busy}
              aria-disabled={busy || undefined}
              aria-busy={isB(`/api/orders/${order.id}/cancel`) || undefined}
              onClick={(e) =>
                act(`/api/orders/${order.id}/cancel`, undefined, undefined, e.currentTarget)
              }
            >
              {isB(`/api/orders/${order.id}/cancel`) && <span className="btn-spin" />}
              {bLabel(`/api/orders/${order.id}/cancel`, "Cancelling…", "Cancel order")}
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
                disabled={busy}
                aria-busy={busy && busyPath === "reassign" || undefined}
                onClick={async () => {
                  const t0 = busyStart();
                  setBusy(true);
                  setBusyPath("reassign");
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
                    await busyEnd(t0);
                    setBusy(false);
                    setBusyPath(null);
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
