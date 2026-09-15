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
    items: {
      id: string;
      qty: number;
      unitPrice: number;
      productId: string;
      product: { sku: string; name: string; unit: string };
    }[];
  };
  payments: { id: string; amount: number; mode: string; createdAt: string }[];
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
      subtitle={`Invoices / ${inv.code} · Order ${inv.order.code} · ${inv.order.customer.name}`}
      actions={
        <>
          <StatusPill status={inv.paymentStatus} />
          <button className="btn-primary" onClick={() => setSheet("payment")}>
            Record payment
          </button>
          <button className="btn-sec" onClick={() => setSheet("return")}>
            Log return
          </button>
          <Link href={`/office/invoices/${inv.id}/print`} className="btn-sec">
            Print
          </Link>
        </>
      }
    >

      <div className="row" style={{ alignItems: "flex-start" }}>
        <div className="card2 grow">
          <h2 className="h3s" style={{ marginBottom: 12 }}>
            Items
          </h2>
          <table className="tbl">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Desc</th>
                <th className="r">Qty</th>
                <th className="r">Unit Rs</th>
                <th className="r">Line Rs</th>
              </tr>
            </thead>
            <tbody>
              {inv.order.items.map((i) => (
                <tr key={i.id}>
                  <td className="sku">{i.product.sku}</td>
                  <td>{i.product.name}</td>
                  <td className="num r">
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
        </div>

        {/* Totals block */}
        <div className="card2" style={{ width: 280, flex: "none" }}>
          <h2 className="h3s" style={{ marginBottom: 12 }}>
            Totals
          </h2>
          <div className="totals" style={{ marginLeft: 0, maxWidth: "none" }}>
            <div className="trow">
              <span>Subtotal</span>
              <Money value={inv.order.subtotal} />
            </div>
            <div className="trow">
              <span>Returns</span>
              <span>
                {returnsTotal > 0 ? "−" : ""}
                <Money value={returnsTotal} />
              </span>
            </div>
            <div className="trow">
              <span>Collected</span>
              <Money value={inv.amountPaid} />
            </div>
            <div className="trow grand">
              <span>Balance due</span>
              <Money value={inv.balance} />
            </div>
          </div>
        </div>
      </div>

      <div className="row" style={{ alignItems: "flex-start" }}>
        <div className="card2 grow">
          <h2 className="h3s" style={{ marginBottom: 12 }}>
            Payments
          </h2>
          {inv.payments.length === 0 ? (
            <p className="muted">No payments yet.</p>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Method</th>
                  <th className="r">Amount</th>
                </tr>
              </thead>
              <tbody>
                {inv.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="text-xs">
                      {new Date(p.createdAt).toLocaleString()}
                    </td>
                    <td className="capitalize">{p.mode}</td>
                    <td className="r">
                      <Money value={p.amount} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card2 grow">
          <h2 className="h3s" style={{ marginBottom: 12 }}>
            Returns
          </h2>
          {inv.returns.length === 0 ? (
            <p className="muted">No returns.</p>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Product</th>
                  <th className="r">Qty</th>
                  <th className="r">Amount</th>
                </tr>
              </thead>
              <tbody>
                {inv.returns.map((r) => (
                  <tr key={r.id}>
                    <td className="text-xs">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td>{r.product.sku}</td>
                    <td className="tnum r">{r.qty}</td>
                    <td className="r">
                      <Money value={r.amount} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
