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
                <th>Product</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Unit price</th>
                <th className="text-right">Line</th>
              </tr>
            </thead>
            <tbody>
              {inv.order.items.map((i) => (
                <tr key={i.id}>
                  <td>
                    <span className="font-mono text-xs text-muted">
                      {i.product.sku}
                    </span>{" "}
                    {i.product.name}
                  </td>
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
  // Amount defaults to the current outstanding balance.
  const [amount, setAmount] = useState(String(balance));
  const [mode, setMode] = useState("cash");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api("/api/payments", {
        method: "POST",
        body: JSON.stringify({ invoiceId, amount: Number(amount), mode }),
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
          <select
            className="input"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="cash">Cash</option>
            <option value="credit">Credit</option>
          </select>
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
  // Compute returnable qty per product = ordered − already returned.
  const returnedByProduct = new Map<string, number>();
  for (const r of invoice.returns) {
    returnedByProduct.set(
      r.productId,
      (returnedByProduct.get(r.productId) ?? 0) + r.qty,
    );
  }
  const options = invoice.order.items
    .map((i) => ({
      productId: i.productId,
      sku: i.product.sku,
      name: i.product.name,
      unitPrice: i.unitPrice,
      returnable: i.qty - (returnedByProduct.get(i.productId) ?? 0),
    }))
    .filter((o) => o.returnable > 0);

  const [productId, setProductId] = useState(options[0]?.productId ?? "");
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selected = options.find((o) => o.productId === productId);
  const max = selected?.returnable ?? 0;
  const previewAmount = (selected?.unitPrice ?? 0) * qty;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api("/api/returns", {
        method: "POST",
        body: JSON.stringify({ invoiceId: invoice.id, productId, qty }),
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Return failed");
      setSaving(false);
    }
  }

  if (options.length === 0) {
    return (
      <SideSheet title="Log return" onClose={onClose}>
        <p className="text-sm text-muted">
          Nothing left to return on this invoice.
        </p>
      </SideSheet>
    );
  }

  return (
    <SideSheet title="Log return" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="label">Product</label>
          <select
            className="input"
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value);
              setQty(1);
            }}
          >
            {options.map((o) => (
              <option key={o.productId} value={o.productId}>
                {o.sku} — {o.name} (up to {o.returnable})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Return qty</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-md border border-line text-xl font-semibold"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
            >
              −
            </button>
            <input
              className="input h-11 w-16 text-center"
              type="number"
              min={1}
              max={max}
              value={qty}
              onChange={(e) =>
                setQty(Math.min(max, Math.max(1, Number(e.target.value) || 1)))
              }
            />
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-md border border-line text-xl font-semibold"
              onClick={() => setQty((q) => Math.min(max, q + 1))}
            >
              +
            </button>
          </div>
        </div>

        <div className="rounded-md bg-primary-soft p-3 text-sm">
          <p className="font-medium text-primary">Preview</p>
          <p className="tnum mt-1">
            Restock +{qty} · Invoice −<Money value={previewAmount} />
          </p>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          className="btn-primary w-full"
          disabled={saving || max === 0}
          onClick={save}
        >
          {saving ? "Posting…" : "Confirm return"}
        </button>
      </div>
    </SideSheet>
  );
}
