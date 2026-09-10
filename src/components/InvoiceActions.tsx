"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { SideSheet } from "@/components/SideSheet";

export type InvoiceLineProduct = {
  sku: string;
  name: string;
  unit: string;
};

export type InvoiceDetail = {
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
      product: InvoiceLineProduct;
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

export function PaymentSheet({
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
        body: JSON.stringify({
          invoiceId,
          amount: Number(amount),
          mode: "cash",
        }),
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
          Outstanding balance:{" "}
          <Money value={balance} className="font-semibold text-ink" />
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
        <button
          className="btn-primary w-full"
          disabled={saving || balance <= 0}
        >
          {balance <= 0 ? "Already settled" : "Record payment"}
        </button>
      </form>
    </SideSheet>
  );
}

export function ReturnSheet({
  invoice,
  onClose,
  onDone,
}: {
  invoice: InvoiceDetail;
  onClose: () => void;
  onDone: () => void;
}) {
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

export function useReturnsTotal(inv: InvoiceDetail | null) {
  return useMemo(
    () => inv?.returns.reduce((s, r) => s + r.amount, 0) ?? 0,
    [inv],
  );
}
