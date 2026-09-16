"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { StatusPill } from "@/components/badges";
import { SideSheet } from "@/components/SideSheet";
import { OfficeChrome } from "@/components/OfficeChrome";
import { PaymentSheet } from "@/components/PaymentSheet";
import { initials } from "@/lib/person";
import { useToast } from "@/components/Toast";

type InvoiceDetail = {
  id: string;
  code: string;
  total: number;
  amountPaid: number;
  balance: number;
  paymentStatus: string;
  createdAt: string;
  order: {
    code: string;
    status: string;
    subtotal: number;
    customer: { name: string; phone: string; area: string | null };
    booker: { name: string };
    items: {
      id: string;
      qty: number;
      unitPrice: number;
      productId: string;
      product: { sku: string; name: string; unit: string };
    }[];
  };
  payments: { id: string; amount: number; mode: string; kind?: string; createdAt: string }[];
  returns: {
    id: string;
    qty: number;
    amount: number;
    productId: string;
    createdAt: string;
    product: { sku: string; name: string };
  }[];
};

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [inv, setInv] = useState<InvoiceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"payment" | "return" | null>(null);

  async function load() {
    try {
      const { invoice } = await api<{ invoice: InvoiceDetail }>(
        `/api/invoices/${id}`,
      );
      setInv(invoice);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const returnsTotal = useMemo(
    () => inv?.returns.reduce((s, r) => s + r.amount, 0) ?? 0,
    [inv],
  );

  if (error && !inv) {
    return (
      <OfficeChrome title="Invoice">
        <p className="muted">{error}</p>
      </OfficeChrome>
    );
  }
  if (!inv) {
    return (
      <OfficeChrome title="Invoice">
        <p className="muted">Loading…</p>
      </OfficeChrome>
    );
  }

  return (
    <OfficeChrome
      title={inv.code}
      kicker={`Invoices / ${inv.code}`}
      status={<StatusPill status={inv.paymentStatus} />}
      actions={
        <>
          <button
            type="button"
            className="btn-sec"
            onClick={() => toast(`Invoice sent on WhatsApp · ${inv.code}`)}
          >
            Send
          </button>
          <Link href={`/office/invoices/${inv.id}/print`} className="btn-sec">
            Print
          </Link>
          <button type="button" className="btn-sec" onClick={() => setSheet("return")}>
            Log return
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setSheet("payment")}
          >
            Record payment
          </button>
        </>
      }
    >
      <div className="row" style={{ gap: 16, alignItems: "stretch" }}>
        <div className="card2" style={{ flex: 1 }}>
          <p className="ptitle-s" style={{ marginBottom: 10 }}>
            Billed to
          </p>
          <div className="person">
            <span className="avatar">{initials(inv.order.customer.name)}</span>
            <span>
              <span className="pname">{inv.order.customer.name}</span>
              <br />
              <span className="pmeta">
                {inv.order.customer.area ?? "—"}
                {inv.order.customer.phone ? ` · ${inv.order.customer.phone}` : ""}
              </span>
            </span>
          </div>
          <dl className="dl" style={{ marginTop: 12 }}>
            <div>
              <dt>Issued</dt>
              <dd className="num">
                {new Date(inv.createdAt).toLocaleDateString("en-GB", {
                  timeZone: "Asia/Karachi",
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </dd>
            </div>
            <div>
              <dt>Collection</dt>
              <dd>Cash on delivery</dd>
            </div>
            <div>
              <dt>Collects</dt>
              <dd>{inv.order.booker.name}</dd>
            </div>
            <div>
              <dt>Received</dt>
              <dd className="num">
                <Money value={inv.amountPaid} />
              </dd>
            </div>
            <div>
              <dt>To collect</dt>
              <dd className="num" style={{ color: "var(--warn-fg)" }}>
                <Money value={inv.balance} />
              </dd>
            </div>
          </dl>
        </div>
        <div className="card2" style={{ width: 340 }}>
          <p className="ptitle-s" style={{ marginBottom: 10 }}>
            Payment history
          </p>
          {inv.payments.length === 0 ? (
            <p className="muted">No payments yet.</p>
          ) : (
            inv.payments.map((p) => (
              <div className="prow" key={p.id}>
                <span>
                  {p.kind === "advance"
                    ? "Advance"
                    : p.kind === "full"
                      ? "Full settlement"
                      : "Part payment"}{" "}
                  ·{" "}
                  {new Date(p.createdAt).toLocaleDateString("en-GB", {
                    timeZone: "Asia/Karachi",
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
                <span className="num">
                  <Money value={p.amount} />
                </span>
              </div>
            ))
          )}
          <div className="prow">
            <span className="pname">To collect</span>
            <span className="num" style={{ fontWeight: 600, color: "var(--warn-fg)" }}>
              <Money value={inv.balance} />
            </span>
          </div>
        </div>
      </div>
      <div className="card2 grow">
        <div className="card2-h">
          <h2 className="h3s">Charges</h2>
          <span className="meta">from order {inv.order.code}</span>
        </div>
        <table className="tbl store">
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
            {inv.order.items.map((i) => (
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
          <div className="trow">
            <span className="muted">Subtotal</span>
            <span className="num">
              <Money value={inv.order.subtotal} />
            </span>
          </div>
          {returnsTotal > 0 ? (
            <div className="trow">
              <span className="muted">Returns</span>
              <span className="num">
                −<Money value={returnsTotal} />
              </span>
            </div>
          ) : null}
          <div className="trow grand">
            <span>Invoice total</span>
            <span className="num">
              <Money value={inv.total} />
            </span>
          </div>
        </div>
      </div>

      {sheet === "payment" && (
        <PaymentSheet
          invoiceId={inv.id}
          invoiceCode={inv.code}
          balance={inv.balance}
          onClose={() => setSheet(null)}
          onDone={() => {
            setSheet(null);
            load();
          }}
        />
      )}
      {sheet === "return" && (
        <ReturnSheet
          invoice={inv}
          onClose={() => setSheet(null)}
          onDone={() => {
            setSheet(null);
            load();
          }}
        />
      )}
    </OfficeChrome>
  );
}

function ReturnSheet({
  invoice,
  onClose,
  onDone,
}: {
  invoice: InvoiceDetail;
  onClose: () => void;
  onDone: () => void;
}) {
  // Returnable qty per product = invoiced qty − already returned (clamped so
  // we never post more than the returns service will allow).
  const returnedByProduct = new Map<string, number>();
  for (const r of invoice.returns) {
    returnedByProduct.set(
      r.productId,
      (returnedByProduct.get(r.productId) ?? 0) + r.qty,
    );
  }
  const lines = invoice.order.items.map((i) => ({
    productId: i.productId,
    sku: i.product.sku,
    name: i.product.name,
    unitPrice: i.unitPrice,
    invoicedQty: i.qty,
    max: Math.max(0, i.qty - (returnedByProduct.get(i.productId) ?? 0)),
  }));

  // Per-line return qty + optional reason (reason is UI-only in v1).
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function setQty(productId: string, value: number, max: number) {
    const clamped = Math.min(max, Math.max(0, value || 0));
    setQtys((prev) => ({ ...prev, [productId]: clamped }));
  }

  const totalQty = lines.reduce((s, l) => s + (qtys[l.productId] ?? 0), 0);
  const totalAmount = lines.reduce(
    (s, l) => s + (qtys[l.productId] ?? 0) * l.unitPrice,
    0,
  );

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const toPost = lines.filter((l) => (qtys[l.productId] ?? 0) > 0);
      for (const l of toPost) {
        await api("/api/returns", {
          method: "POST",
          body: JSON.stringify({
            invoiceId: invoice.id,
            productId: l.productId,
            qty: qtys[l.productId],
          }),
        });
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Return failed");
      setSaving(false);
    }
  }

  return (
    <SideSheet title={`Log returns — Invoice #${invoice.code}`} onClose={onClose}>
      <div className="stack" style={{ gap: 12 }}>
        {lines.map((l) => {
            const qty = qtys[l.productId] ?? 0;
            const disabled = l.max === 0;
            return (
              <div key={l.productId} className="qty-row">
                <span className="grow">
                  <span className="pname">{l.name}</span>
                  <br />
                  <span className="pmeta num">
                    {l.sku} · invoiced {l.invoicedQty}
                    {l.max < l.invoicedQty ? ` · returnable ${l.max}` : ""}
                  </span>
                </span>
                <span className="qty-ctl">
                    <button
                      type="button"
                      className="qty-btn"
                      disabled={disabled || qty <= 0}
                      onClick={() => setQty(l.productId, qty - 1, l.max)}
                      aria-label={`decrease ${l.sku}`}
                    >
                      −
                    </button>
                    <span className="qty-val">{qty}</span>
                    <button
                      type="button"
                      className="qty-btn"
                      disabled={disabled || qty >= l.max}
                      onClick={() => setQty(l.productId, qty + 1, l.max)}
                      aria-label={`increase ${l.sku}`}
                    >
                      +
                    </button>
                </span>
              </div>
            );
          })}

        <p className="meta">
          Restock +{totalQty} · Invoice −<Money value={totalAmount} />
        </p>

        {error && <p className="muted">{error}</p>}
        <button
          className="btn-primary btn-block"
          disabled={saving || totalQty === 0}
          onClick={save}
        >
          {saving ? "Posting…" : "Confirm returns"}
        </button>
      </div>
    </SideSheet>
  );
}
