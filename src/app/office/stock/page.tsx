"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/generated/prisma/client";
import { api } from "@/lib/client";
import { OfficeChrome } from "@/components/OfficeChrome";
import { StatusPill } from "@/components/badges";
import { stockTone } from "@/lib/status";

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
      const [{ products: rows }, { entries }] = await Promise.all([
        api<{ products: Product[] }>("/api/products?active=true"),
        api<{ entries: LedgerEntry[] }>("/api/stock/ledger"),
      ]);
      setProducts(rows);
      setLedger(entries);
      if (!productId && rows[0]) setProductId(rows[0].id);
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
    <OfficeChrome
      title="Stock"
      subtitle="Godown · on hand vs reorder"
      actions={
        <button className="btn-sec" form="stock-adjust">
          Adjust
        </button>
      }
    >
      {error && <p className="muted">{error}</p>}
      <div className="row" style={{ alignItems: "stretch" }}>
        <div className="card2 grow">
          <div className="tbl-wrap">
            <table className="tbl tight">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product</th>
                  <th className="r">On hand</th>
                  <th className="r">Reorder at</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const st = stockTone(p.stockQty, p.reorderLevel);
                  return (
                    <tr key={p.id}>
                      <td className="sku">{p.sku}</td>
                      <td>{p.name}</td>
                      <td className="r num">
                        {p.stockQty} {p.unit}
                      </td>
                      <td className="r num">{p.reorderLevel ?? "—"}</td>
                      <td>
                        <StatusPill label={st.label} tone={st.tone} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <aside className="card2" style={{ width: 224, flex: "none" }}>
          <div className="card2-h">
            <h2 className="h3s">Adjust</h2>
          </div>
          <form id="stock-adjust" onSubmit={adjust} className="stack">
            <div className="lfield">
              <label>Product</label>
              <select
                className="linput"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku}
                  </option>
                ))}
              </select>
            </div>
            <div className="lfield">
              <label>Delta</label>
              <input
                className="linput"
                type="number"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                required
              />
            </div>
            <div className="lfield">
              <label>Reason</label>
              <select
                className="linput"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                <option value="purchase">purchase</option>
                <option value="adjustment">adjustment</option>
                <option value="correction">correction</option>
              </select>
            </div>
            <button className="btn-primary btn-block">Apply</button>
          </form>
          <p className="ptitle-s" style={{ marginTop: 16 }}>
            Recent
          </p>
          {ledger.slice(0, 6).map((l) => (
            <div key={l.id} className="prow">
              <span>
                <span className="sku">{l.product.sku}</span>
                <br />
                <span className="pmeta">{l.reason}</span>
              </span>
              <span className="num">
                {l.delta > 0 ? `+${l.delta}` : l.delta}
              </span>
            </div>
          ))}
        </aside>
      </div>
    </OfficeChrome>
  );
}
