"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { StatusPill } from "@/components/badges";
import { SideSheet } from "@/components/SideSheet";

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

  if (error && !inv) return <p className="text-danger">{error}</p>;
  if (!inv) return <p className="text-muted">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/office/invoices" className="text-sm text-primary">
            ← Invoices
          </Link>
          <h1 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-bold">
            {inv.code}
            <StatusPill status={inv.paymentStatus} />
            <StatusPill status={inv.order.status} />
            {inv.returns.length > 0 && <StatusPill status="return_logged" />}
          </h1>
          <p className="text-sm text-muted">
            Order {inv.order.code} · {inv.order.customer.name}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary" onClick={() => setSheet("payment")}>
            Record payment
          </button>
          <button className="btn-secondary" onClick={() => setSheet("return")}>
            Log return
          </button>
          <Link
            href={`/office/invoices/${inv.id}/print`}
            className="btn-secondary"
          >
            Print / PDF
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-3 font-semibold">Items</h2>
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
              {inv.order.items.map((i) => (
                <tr key={i.id}>
                  <td className="font-mono text-xs text-muted">
                    {i.product.sku}
                  </td>
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
          </table>
        </div>

        {/* Totals block */}
        <div className="card h-fit">
          <h2 className="mb-3 font-semibold">Totals</h2>
          <dl className="space-y-2 text-sm">
            <TotalRow label="Subtotal">
              <Money value={inv.order.subtotal} />
            </TotalRow>
            <TotalRow label="Returns">
              <span className="text-accent">
                {returnsTotal > 0 ? "−" : ""}
                <Money value={returnsTotal} />
              </span>
            </TotalRow>
            <TotalRow label="Paid">
              <span className="text-success">
                {inv.amountPaid > 0 ? "−" : ""}
                <Money value={inv.amountPaid} />
              </span>
            </TotalRow>
            <div className="mt-2 flex items-center justify-between border-t border-line pt-3">
              <dt className="text-base font-semibold">Balance due</dt>
              <dd className="text-2xl font-bold text-primary">
                <Money value={inv.balance} />
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 font-semibold">Payments</h2>
          {inv.payments.length === 0 ? (
            <p className="text-sm text-muted">No payments yet.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Method</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {inv.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="text-xs">
                      {new Date(p.createdAt).toLocaleString()}
                    </td>
                    <td className="capitalize">{p.mode}</td>
                    <td className="text-right">
                      <Money value={p.amount} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h2 className="mb-2 font-semibold">Returns</h2>
          {inv.returns.length === 0 ? (
            <p className="text-sm text-muted">No returns.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Product</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {inv.returns.map((r) => (
                  <tr key={r.id}>
                    <td className="text-xs">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td>{r.product.sku}</td>
                    <td className="tnum text-right">{r.qty}</td>
                    <td className="text-right">
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
    </div>
  );
}

function TotalRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function PaymentSheet({
  invoiceId,
  balance,
  onClose,
  onDone,
}: {
  invoiceId: string;
  balance: number;
  onClose: () => void;
  onDone: () => void;
}) {
  // Amount defaults to the current outstanding balance. v1 is cash-only.
  const [amount, setAmount] = useState(String(balance));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api("/api/payments", {
        method: "POST",
        body: JSON.stringify({ invoiceId, amount: Number(amount), mode: "cash" }),
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
      setSaving(false);
    }
  }

  return (
    <SideSheet title="Record payment" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <p className="text-sm text-muted">
          Outstanding balance: <Money value={balance} className="font-semibold text-ink" />
        </p>
        <div>
          <label className="label">Amount (PKR)</label>
          <input
            className="input"
            type="number"
            min={1}
            max={balance}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <p className="mt-1 text-xs text-muted">
            Partial payments allowed. Cannot exceed the balance.
          </p>
        </div>
        <div>
          <label className="label">Method</label>
          <p className="input flex items-center bg-canvas text-muted">Cash</p>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button className="btn-primary w-full" disabled={saving || balance <= 0}>
          {balance <= 0 ? "Already settled" : "Record payment"}
        </button>
      </form>
    </SideSheet>
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
  const [reasons, setReasons] = useState<Record<string, string>>({});
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
      <div className="space-y-4">
        <div className="space-y-3">
          {lines.map((l) => {
            const qty = qtys[l.productId] ?? 0;
            const disabled = l.max === 0;
            return (
              <div key={l.productId} className="rounded-md border border-line p-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-muted">{l.sku}</p>
                    <p className="truncate text-sm font-medium">{l.name}</p>
                    <p className="text-xs text-muted">
                      Invoiced qty: <span className="tnum">{l.invoicedQty}</span>
                      {l.max < l.invoicedQty && (
                        <span> · returnable {l.max}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-md border border-line text-lg font-semibold disabled:opacity-40"
                      disabled={disabled || qty <= 0}
                      onClick={() => setQty(l.productId, qty - 1, l.max)}
                      aria-label={`decrease ${l.sku}`}
                    >
                      −
                    </button>
                    <input
                      className="input h-9 w-14 text-center"
                      type="number"
                      min={0}
                      max={l.max}
                      value={qty}
                      disabled={disabled}
                      onChange={(e) =>
                        setQty(l.productId, Number(e.target.value), l.max)
                      }
                    />
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-md border border-line text-lg font-semibold disabled:opacity-40"
                      disabled={disabled || qty >= l.max}
                      onClick={() => setQty(l.productId, qty + 1, l.max)}
                      aria-label={`increase ${l.sku}`}
                    >
                      +
                    </button>
                  </div>
                </div>
                <input
                  className="input mt-2 h-9 text-sm"
                  placeholder="Reason (optional)"
                  value={reasons[l.productId] ?? ""}
                  disabled={disabled}
                  onChange={(e) =>
                    setReasons((prev) => ({
                      ...prev,
                      [l.productId]: e.target.value,
                    }))
                  }
                />
              </div>
            );
          })}
        </div>

        <div className="rounded-md bg-primary-soft p-3 text-sm">
          <p className="font-medium text-primary">Preview</p>
          <p className="tnum mt-1">
            Restock +{totalQty} · Invoice −<Money value={totalAmount} />
          </p>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          className="btn-primary w-full"
          disabled={saving || totalQty === 0}
          onClick={save}
        >
          {saving ? "Posting…" : "Confirm returns"}
        </button>
      </div>
    </SideSheet>
  );
}
