"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { StatusPill } from "@/components/badges";
import { BookerChrome } from "@/components/BookerChrome";
import { PaymentSheet } from "@/components/PaymentSheet";
import { SkelDetail } from "@/components/skeletons";
import { Icon } from "@/components/Icon";
import { orderLabel } from "@/lib/orderLabel";
import { methodLabel } from "@/lib/status";
import {
  busyStart,
  busyEnd,
  lockButtonWidth,
  useBusyLong,
} from "@/lib/busy";

/**
 * Figmi spec C (handoff-v3/booker-order-detail.md) + Privy seq211 amendments.
 * Booker-PWA order detail: ONE header pill (§5 vocabulary), summary card,
 * money hero only when invoice state exists (no fake Rs 0), line items,
 * balance row + Collect via the SAME PaymentSheet the list uses.
 * Writes a booker may do here: Submit own draft, Collect. No delete/reassign.
 * Edit lands separately behind Breevie's PATCH /api/orders/[id] contract.
 */

type Detail = {
  id: string;
  code: string;
  status: string;
  subtotal: number;
  advance: number;
  notes: string | null;
  createdAt: string;
  customer: { name: string; area: string | null; route: string | null };
  booker: { name: string };
  items: {
    id: string;
    qty: number;
    unitPrice: number;
    product: { sku: string; name: string; unit: string };
  }[];
  invoice: {
    id: string;
    code: string;
    total: number;
    amountPaid: number;
    balance: number;
    paymentStatus: string;
    deliveredAt: string | null;
    returns?: { qty: number; amount: number }[];
  } | null;
};

function placedLabel(iso: string): string {
  return new Date(iso).toLocaleString("en-PK", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Karachi",
  });
}

export default function BookerOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [discardArmed, setDiscardArmed] = useState(false);
  const [busyPath, setBusyPath] = useState<string | null>(null);
  const [collectOpen, setCollectOpen] = useState(false);

  const load = useCallback(() => {
    return api<{ order: Detail }>(`/api/orders/${id}`)
      .then((d) => setOrder(d.order))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(path: string, body?: unknown, el?: HTMLElement) {
    const t0 = busyStart();
    lockButtonWidth(el ?? null);
    setBusy(true);
    setBusyPath(path);
    setError(null);
    try {
      await api(path, {
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    }
    await busyEnd(t0);
    setBusy(false);
    setBusyPath(null);
  }
  const isB = (p: string) => busy && busyPath === p;
  const long = useBusyLong(busy);

  if (error && !order) {
    return (
      <BookerChrome title="Order" backHref="/booker/orders">
        <p className="muted">{error}</p>
      </BookerChrome>
    );
  }
  if (!order) {
    return (
      <BookerChrome title="Order" backHref="/booker/orders">
        <SkelDetail noun="order" />
      </BookerChrome>
    );
  }

  const ui = orderLabel(order);
  const inv = order.invoice;
  const balance = inv?.balance ?? 0;
  // Spec E §9 detail-card fix (Privy seq476): the 'Collected' hero shows
  // CASH IN (amountPaid) — a bare zero-balance read as "Collected Rs 0",
  // which is a lie on any settled-with-advance order. Returns come through
  // as their own line so an invoice paid above its (return-reduced) total
  // stays legible instead of clamping into mystery.
  const paid = inv?.amountPaid ?? 0;
  const returnsTotal = (inv?.returns ?? []).reduce((s, r) => s + r.amount, 0);
  const collectedPct =
    inv && inv.total > 0 ? Math.min(100, Math.floor((paid / inv.total) * 100)) : 0;
  const isDraft = order.status === "draft";
  const isSubmitted = order.status === "submitted";
  const isCancelled = order.status === "cancelled";
  const itemCount = order.items.reduce((s, i) => s + i.qty, 0);
  // Spec E §6 + §9(1) (owner REMOVE ratified @474): name who acts next, so
  // the office-side transition rule reads as a rule, not a dead end. Money
  // beats status — a balance means the booker's Collect is live regardless
  // of delivery state. Terminal states and "nothing owed to anyone" show no
  // row at all.
  const nextRow: string | null =
    order.status === "settled" || isCancelled
      ? null
      : isDraft
        ? "Yours to submit"
        : isSubmitted
          ? "Office confirms"
          : balance > 0
            ? order.status === "delivered"
              ? "Yours to collect"
              : "Collect on delivery"
            : order.status === "out_for_delivery"
              ? "Office is on the road"
              : order.status === "confirmed"
                ? "Office dispatches"
                : null;

  return (
    <BookerChrome
      title={order.code}
      backHref="/booker/orders"
      meta={
        <span className="row" style={{ gap: 8 }}>
          <span className="pmeta">{order.customer.name}</span>
          <StatusPill label={ui.label} tone={ui.tone} />
        </span>
      }
    >
      {error && <p className="muted">{error}</p>}

      {/* A. summary strip */}
      <div className="pcard">
        <div className="prow">
          <span className="prow-l">Placed</span>
          <span className="prow-v num">{placedLabel(order.createdAt)}</span>
        </div>
        <div className="prow">
          <span className="prow-l">Route</span>
          <span className="prow-v num">
            {order.customer.route ? `Route ${order.customer.route}` : "—"}
          </span>
        </div>
        <div className="prow">
          <span className="prow-l">Items</span>
          <span className="prow-v num">{itemCount}</span>
        </div>
        <div className="prow">
          <span className="prow-l">Delivery</span>
          <span
            className="prow-v"
            style={{ color: inv?.deliveredAt ? "var(--ok-fg)" : "var(--muted)" }}
          >
            {inv?.deliveredAt ? "Delivered ✓" : "Not delivered"}
          </span>
        </div>
        {nextRow && (
          // Spec E §6: read-only, one line, names a party not a person, never
          // restates the pill. Terminal states and held states show nothing.
          <div className="prow">
            <span className="prow-l">Next</span>
            <span className="prow-v">{nextRow}</span>
          </div>
        )}
      </div>

      {/* B. money hero — only once an invoice (money state) carries a number
          worth naming (F1/gate 28: a money word never sits beside Rs 0) */}
      {inv && (balance > 0 || paid > 0) && (
        <div className="phero">
          <div className="rowb">
            <p className="phero-lab">{balance > 0 ? "To collect" : "Collected"}</p>
            <span className="phero-route">{inv.code}</span>
          </div>
          <p className="phero-val num">
            {/* 'Collected' = cash that landed (amountPaid), never the
                balance-zero it used to print. */}
            <Money value={balance > 0 ? balance : paid} />
          </p>
          <div className="phero-bar">
            <span style={{ width: `${collectedPct}%` }} />
          </div>
          <div className="rowb" style={{ marginTop: 8 }}>
            <span className="phero-meta">
              {collectedPct}% of <Money value={inv.total} /> in
            </span>
            <span className="phero-meta">
              {methodLabel(order.advance, order.subtotal, balance).label}
            </span>
          </div>
        </div>
      )}

      {/* C. line items */}
      <div className="pcard">
        <div className="rowb" style={{ marginBottom: 6 }}>
          <p className="ptitle-s">Line items</p>
          <span className="pmeta">{order.items.length} lines</span>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Product</th>
              <th className="r">Qty</th>
              <th className="r">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={i.id}>
                <td>
                  <span className="pname">{i.product.name}</span>
                  <br />
                  <span className="sku">{i.product.sku}</span>
                </td>
                <td className="r num">{i.qty}</td>
                <td className="r money"><Money value={i.qty * i.unitPrice} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="prow" style={{ marginTop: 6 }}>
          <span className="prow-l">Subtotal</span>
          <span className="prow-v money"><Money value={order.subtotal} /></span>
        </div>
        {returnsTotal > 0 && (
          // Privy seq489 + Figmi seq493 (gate 29, corrected): the Return
          // entity is real and INV-00020 HAS a row — the card tells the story
          // with the record that exists, mirroring office/invoices/[id]
          // 'Subtotal / Returns −X / Invoice total'. No return record ⇒ no
          // row; the delta is never inferred into a goods claim.
          <div className="prow">
            <span className="prow-l">Returns</span>
            <span className="prow-v num">
              −<Money value={returnsTotal} />
            </span>
          </div>
        )}
        <div className="prow">
          <span className="prow-l">
            <span className="pname">{inv ? "Invoice total" : "Total"}</span>
          </span>
          <span className="prow-v num" style={{ fontWeight: 600 }}>
            {/* F4 (ratified): the two tables never share the bare word Total
                while both are in view — once an invoice exists the grand row
                reads the INVOICE table (Subtotal − Returns = Invoice total),
                which is the number the money hero and bar measure against. */}
            <Money value={inv ? inv.total : order.subtotal} />
          </span>
        </div>
      </div>

      {/* D. balance row (warn tone, display-only) */}
      {balance > 0 && (
        <div className="balance">
          <span>To collect on delivery</span>
          <span className="num"><Money value={balance} /></span>
        </div>
      )}

      {/* E. actions — §1.3 matrix; the only booker writes are Submit + Collect */}
      {balance > 0 && inv && (
        <button
          type="button"
          className="btn-primary btn-block"
          style={{ justifyContent: "center" }}
          onClick={() => setCollectOpen(true)}
        >
          <Icon name="ledger" className="ic ic-sm" />
          Collect
        </button>
      )}
      {isDraft && (
        <div className="stack" style={{ gap: 10 }}>
          <button
            type="button"
            className={`btn-primary btn-block${isB(`/api/orders/${order.id}/submit`) ? " is-busy" : ""}`}
            style={{ justifyContent: "center" }}
            disabled={busy}
            aria-disabled={busy || undefined}
            aria-busy={isB(`/api/orders/${order.id}/submit`) || undefined}
            onClick={(e) =>
              act(`/api/orders/${order.id}/submit`, undefined, e.currentTarget)
            }
          >
            {isB(`/api/orders/${order.id}/submit`) && <span className="btn-spin" />}
            {isB(`/api/orders/${order.id}/submit`)
              ? long
                ? "Still working…"
                : "Submitting…"
              : "Submit"}
          </button>
          <div className="row" style={{ gap: 10 }}>
            <Link
              href={`/booker/orders/${order.id}/edit`}
              className="btn-sec grow"
              style={{ justifyContent: "center" }}
            >
              Edit
            </Link>
            <button
              type="button"
              className={`btn-sec grow${isB(`/api/orders/${order.id}/cancel`) ? " is-busy" : ""}`}
              style={{ justifyContent: "center", color: "var(--bad-fg)" }}
              disabled={busy}
              aria-disabled={busy || undefined}
              aria-busy={isB(`/api/orders/${order.id}/cancel`) || undefined}
              onClick={(e) => {
                if (!discardArmed) {
                  setDiscardArmed(true);
                  return;
                }
                act(`/api/orders/${order.id}/cancel`, undefined, e.currentTarget);
              }}
              onBlur={() => setDiscardArmed(false)}
            >
              {isB(`/api/orders/${order.id}/cancel`) && <span className="btn-spin" />}
              {isB(`/api/orders/${order.id}/cancel`)
                ? long
                  ? "Still working…"
                  : "Discarding…"
                : discardArmed
                  ? "Confirm discard?"
                  : "Discard"}
            </button>
          </div>
        </div>
      )}
      {isSubmitted && (
        <p className="meta" style={{ textAlign: "center" }}>
          Sent to office — awaiting confirmation.
        </p>
      )}
      {isCancelled && (
        <p className="meta" style={{ textAlign: "center" }}>
          This order was cancelled.
        </p>
      )}

      {collectOpen && inv && (
        <PaymentSheet
          invoiceId={inv.id}
          invoiceCode={inv.code}
          balance={balance}
          onClose={() => setCollectOpen(false)}
          onDone={() => {
            setCollectOpen(false);
            load();
          }}
        />
      )}
    </BookerChrome>
  );
}
