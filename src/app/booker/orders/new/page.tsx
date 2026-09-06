"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Customer, Product } from "@prisma/client";
import { api } from "@/lib/client";
import { formatPKR } from "@/lib/money";

type CartLine = {
  product: Product;
  qty: number;
  unitPrice: number;
};

export default function NewOrderPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api<{ customers: Customer[] }>("/api/customers").then((d) =>
      setCustomers(d.customers),
    );
    searchProducts("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function searchProducts(q: string) {
    const query = q ? `?active=true&search=${encodeURIComponent(q)}` : "?active=true";
    const { products } = await api<{ products: Product[] }>(
      `/api/products${query}`,
    );
    setProducts(products);
  }

  function addToCart(p: Product) {
    setCart((prev) => {
      if (prev.some((l) => l.product.id === p.id)) return prev;
      return [...prev, { product: p, qty: 1, unitPrice: p.price }];
    });
  }

  function updateLine(id: string, patch: Partial<CartLine>) {
    setCart((prev) =>
      prev.map((l) => (l.product.id === id ? { ...l, ...patch } : l)),
    );
  }

  function removeLine(id: string) {
    setCart((prev) => prev.filter((l) => l.product.id !== id));
  }

  const subtotal = cart.reduce((s, l) => s + l.qty * l.unitPrice, 0);

  async function submit() {
    setError(null);
    if (!customerId) {
      setError("Pick a shop first");
      return;
    }
    if (cart.length === 0) {
      setError("Add at least one product");
      return;
    }
    setSubmitting(true);
    try {
      const result = await api<{
        order: { code: string };
        warnings: { sku: string; requested: number; available: number }[];
      }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          customerId,
          submit: true,
          notes: notes || undefined,
          items: cart.map((l) => ({
            productId: l.product.id,
            qty: l.qty,
            unitPrice: l.unitPrice,
          })),
        }),
      });
      const warn =
        result.warnings.length > 0
          ? `\nNote (non-blocking): low stock on ${result.warnings
              .map((w) => `${w.sku} (req ${w.requested}/avail ${w.available})`)
              .join(", ")}`
          : "";
      alert(`Order ${result.order.code} submitted!${warn}`);
      router.push("/booker/orders");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">New order</h1>

      <div className="card space-y-2">
        <label className="label">Shop</label>
        <select
          className="input"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
        >
          <option value="">— select a shop —</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.area ? `(${c.area})` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="card space-y-2">
        <label className="label">Add products (search SKU / name)</label>
        <input
          className="input"
          placeholder="e.g. sugar, oil, SKU-…"
          value={productQuery}
          onChange={(e) => {
            setProductQuery(e.target.value);
            searchProducts(e.target.value);
          }}
        />
        <div className="max-h-48 space-y-1 overflow-y-auto">
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              className="flex w-full items-center justify-between rounded border border-slate-200 px-2 py-1.5 text-left text-sm hover:bg-slate-50"
            >
              <span>
                <span className="font-mono text-xs text-slate-400">{p.sku}</span>{" "}
                {p.name}
                <span className="ml-1 text-xs text-slate-400">
                  (stock {p.stockQty})
                </span>
              </span>
              <span className="font-medium">{formatPKR(p.price)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">Order items</h2>
        {cart.length === 0 && (
          <p className="text-sm text-slate-500">No items yet.</p>
        )}
        {cart.map((l) => {
          const overStock = l.qty > l.product.stockQty;
          return (
            <div key={l.product.id} className="rounded border border-slate-200 p-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{l.product.name}</p>
                <button
                  className="text-xs text-red-600"
                  onClick={() => removeLine(l.product.id)}
                >
                  Remove
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500">Qty</label>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    value={l.qty}
                    onChange={(e) =>
                      updateLine(l.product.id, {
                        qty: Math.max(1, Number(e.target.value)),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Unit price</label>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={l.unitPrice}
                    onChange={(e) =>
                      updateLine(l.product.id, {
                        unitPrice: Math.max(0, Number(e.target.value)),
                      })
                    }
                  />
                </div>
              </div>
              {overStock && (
                <p className="mt-1 text-xs text-amber-600">
                  ⚠ Only {l.product.stockQty} in stock (order can still be
                  submitted).
                </p>
              )}
              <p className="mt-1 text-right text-sm font-semibold">
                {formatPKR(l.qty * l.unitPrice)}
              </p>
            </div>
          );
        })}
        <div className="flex items-center justify-between border-t border-slate-200 pt-2">
          <span className="font-semibold">Subtotal</span>
          <span className="text-lg font-bold">{formatPKR(subtotal)}</span>
        </div>
      </div>

      <div className="card space-y-2">
        <label className="label">Notes (optional)</label>
        <input
          className="input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        className="btn-primary w-full"
        onClick={submit}
        disabled={submitting}
      >
        {submitting ? "Submitting…" : "Submit order"}
      </button>
    </div>
  );
}
