"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client";
import { formatPKR } from "@/lib/money";
import { PayBadge } from "@/components/badges";

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
    createdAt: string;
    product: { sku: string; name: string };
  }[];
};

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [inv, setInv] = useState<InvoiceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState("cash");
  const [retProduct, setRetProduct] = useState("");
  const [retQty, setRetQty] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const { invoice } = await api<{ invoice: InvoiceDetail }>(
        `/api/invoices/${id}`,
      );
      setInv(invoice);
      if (!retProduct && invoice.order.items[0]) {
        setRetProduct(invoice.order.items[0].productId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function recordPayment(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          invoiceId: id,
          amount: Number(payAmount),
          mode: payMode,
        }),
      });
      setPayAmount("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  async function logReturn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/returns", {
        method: "POST",
        body: JSON.stringify({
          invoiceId: id,
          productId: retProduct,
          qty: Number(retQty),
        }),
      });
      setRetQty("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Return failed");
    } finally {
      setBusy(false);
    }
  }

  if (error && !inv) return <p className="text-red-600">{error}</p>;
  if (!inv) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/office/invoices" className="text-sm text-brand-600">
            ← Invoices
          </Link>
          <h1 className="mt-1 text-2xl font-bold">
            {inv.code} <PayBadge status={inv.paymentStatus} />
          </h1>
          <p className="text-sm text-slate-500">
            Order {inv.order.code} · {inv.order.customer.name}
          </p>
        </div>
        <Link
          href={`/office/invoices/${inv.id}/print`}
          className="btn-secondary"
        >
          Print invoice
        </Link>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-3 font-semibold">Items</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Unit price</th>
                <th>Line</th>
              </tr>
            </thead>
            <tbody>
              {inv.order.items.map((i) => (
                <tr key={i.id}>
                  <td>
                    <span className="font-mono text-xs">{i.product.sku}</span>{" "}
                    {i.product.name}
                  </td>
                  <td>
                    {i.qty} {i.product.unit}
                  </td>
                  <td>{formatPKR(i.unitPrice)}</td>
                  <td>{formatPKR(i.qty * i.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:w-1/2 sm:ml-auto">
            <span className="text-slate-500">Total</span>
            <span className="text-right font-semibold">{formatPKR(inv.total)}</span>
            <span className="text-slate-500">Paid</span>
            <span className="text-right">{formatPKR(inv.amountPaid)}</span>
            <span className="text-slate-500">Balance</span>
            <span className="text-right font-semibold">
              {formatPKR(inv.balance)}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <form onSubmit={recordPayment} className="card space-y-2">
            <h2 className="font-semibold">Record payment</h2>
            <div>
              <label className="label">Amount (PKR)</label>
              <input
                className="input"
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Mode</label>
              <select
                className="input"
                value={payMode}
                onChange={(e) => setPayMode(e.target.value)}
              >
                <option value="cash">cash</option>
                <option value="credit">credit</option>
              </select>
            </div>
            <button className="btn-primary w-full" disabled={busy || inv.balance <= 0}>
              {inv.balance <= 0 ? "Fully paid" : "Add payment"}
            </button>
          </form>

          <form onSubmit={logReturn} className="card space-y-2">
            <h2 className="font-semibold">Log return</h2>
            <div>
              <label className="label">Product</label>
              <select
                className="input"
                value={retProduct}
                onChange={(e) => setRetProduct(e.target.value)}
              >
                {inv.order.items.map((i) => (
                  <option key={i.productId} value={i.productId}>
                    {i.product.sku} — {i.product.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Qty</label>
              <input
                className="input"
                type="number"
                value={retQty}
                onChange={(e) => setRetQty(e.target.value)}
                required
              />
            </div>
            <button className="btn-secondary w-full" disabled={busy}>
              Log return (restock)
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 font-semibold">Payments</h2>
          {inv.payments.length === 0 ? (
            <p className="text-sm text-slate-500">No payments yet.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Mode</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {inv.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="text-xs">
                      {new Date(p.createdAt).toLocaleString()}
                    </td>
                    <td>{p.mode}</td>
                    <td>{formatPKR(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h2 className="mb-2 font-semibold">Returns</h2>
          {inv.returns.length === 0 ? (
            <p className="text-sm text-slate-500">No returns.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {inv.returns.map((r) => (
                  <tr key={r.id}>
                    <td className="text-xs">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td>{r.product.sku}</td>
                    <td>{r.qty}</td>
                    <td>{formatPKR(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
