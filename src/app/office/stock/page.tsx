"use client";

import { useEffect, useState } from "react";
import type { Product } from "@prisma/client";
import { api } from "@/lib/client";
import { OfficeChrome } from "@/components/OfficeChrome";

type LedgerEntry = {
  id: string;
  delta: number;
  reason: string;
  balanceAfter: number;
  createdAt: string;
  refType: string | null;
  product: { sku: string; name: string };
};

export default function StockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [productId, setProductId] = useState("");
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("purchase");

  async function load() {
    try {
      const [{ products }, { entries }] = await Promise.all([
        api<{ products: Product[] }>("/api/products?active=true"),
        api<{ entries: LedgerEntry[] }>("/api/stock/ledger"),
      ]);
      setProducts(products);
      setLedger(entries);
      if (!productId && products[0]) setProductId(products[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function adjust(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api("/api/stock/adjust", {
        method: "POST",
        body: JSON.stringify({
          productId,
          delta: Number(delta),
          reason,
        }),
      });
      setDelta("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Adjustment failed");
    }
  }

  return (
    <OfficeChrome title="Stock ledger">
      {error && <p className="text-red-600">{error}</p>}

      <form onSubmit={adjust} className="card grid grid-cols-1 gap-3 sm:grid-cols-4">
        <h2 className="col-span-full font-semibold">Manual adjustment</h2>
        <div className="sm:col-span-2">
          <label className="label">Product</label>
          <select
            className="input"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku} — {p.name} (stock {p.stockQty})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Delta (+/-)</label>
          <input
            className="input"
            type="number"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            placeholder="e.g. 50 or -5"
            required
          />
        </div>
        <div>
          <label className="label">Reason</label>
          <select
            className="input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            <option value="purchase">purchase</option>
            <option value="adjustment">adjustment</option>
            <option value="correction">correction</option>
          </select>
        </div>
        <div className="col-span-full">
          <button className="btn-primary">Apply adjustment</button>
        </div>
      </form>

      <div className="card">
        <h2 className="mb-3 font-semibold">Current stock</h2>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>Stock</th>
                <th>Reorder</th>
                <th>Flag</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const low =
                  p.reorderLevel != null && p.stockQty <= p.reorderLevel;
                return (
                  <tr key={p.id}>
                    <td className="font-mono text-xs">{p.sku}</td>
                    <td>{p.name}</td>
                    <td className={low ? "font-semibold text-red-600" : ""}>
                      {p.stockQty} {p.unit}
                    </td>
                    <td>{p.reorderLevel ?? "—"}</td>
                    <td>
                      {low && (
                        <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">
                          Low
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">Ledger history</h2>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Product</th>
                <th>Delta</th>
                <th>Reason</th>
                <th>Ref</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((l) => (
                <tr key={l.id}>
                  <td className="whitespace-nowrap text-xs">
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                  <td>{l.product.sku}</td>
                  <td
                    className={
                      l.delta >= 0 ? "text-green-700" : "text-red-600"
                    }
                  >
                    {l.delta > 0 ? `+${l.delta}` : l.delta}
                  </td>
                  <td>{l.reason === "return" ? "Return restock" : l.reason}</td>
                  <td className="text-xs text-slate-500">{l.refType ?? "—"}</td>
                  <td>{l.balanceAfter}</td>
                </tr>
              ))}
              {ledger.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-slate-500">
                    No movements yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </OfficeChrome>
  );
}
