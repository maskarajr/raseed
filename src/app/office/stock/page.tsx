"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/generated/prisma/client";
import { api } from "@/lib/client";
import { OfficeChrome } from "@/components/OfficeChrome";
import { CountUp } from "@/components/CountUp";
import { StatusPill } from "@/components/badges";
import { SideSheet } from "@/components/SideSheet";
import { stockTone } from "@/lib/status";
import { endOfTodayKarachi, startOfTodayKarachi } from "@/lib/day";

type LedgerEntry = {
  id: string;
  delta: number;
  reason: string;
  balanceAfter: number;
  createdAt: string;
  refType: string | null;
  product: { sku: string; name: string };
};

const REASON_LABEL: Record<string, string> = {
  purchase: "Inward",
  sale: "Outward",
  return: "Return",
  adjustment: "Adjustment",
  correction: "Correction",
};

const TIME_KHI = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Karachi",
  hour: "2-digit",
  minute: "2-digit",
});

const DATE_KHI = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Karachi",
  day: "2-digit",
  month: "short",
});

/** Board: brand column. Product has no brand field — category is the
 *  standing proxy on demo (per PM decision), rendered "—" when unset. */
function brandOf(p: Product): string {
  return p.category?.trim() || "";
}

function dotColor(e: LedgerEntry): string | undefined {
  if (e.reason === "return") return "var(--info-fg)";
  if (e.delta > 0) return "var(--ok-fg)";
  return undefined;
}

export default function StockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState("");
  const [sheet, setSheet] = useState<"adjust" | "ledger" | null>(null);
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
      setSheet(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Adjustment failed");
    }
  }

  const brands = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      const b = brandOf(p);
      if (b) set.add(b);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return products
      .filter((p) => {
        if (brand && brandOf(p) !== brand) return false;
        if (term) {
          const hay = `${p.sku} ${p.name} ${brandOf(p)}`.toLowerCase();
          if (!hay.includes(term)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const ba = brandOf(a);
        const bb = brandOf(b);
        if (ba !== bb) {
          if (!ba) return 1;
          if (!bb) return -1;
          return ba.localeCompare(bb);
        }
        return a.name.localeCompare(b.name);
      });
  }, [products, q, brand]);

  const stockValue = products.reduce((s, p) => s + p.stockQty * p.price, 0);
  const units = products.reduce((s, p) => s + p.stockQty, 0);
  const low = products.filter(
    (p) => stockTone(p.stockQty, p.reorderLevel).tone === "warn",
  );
  const out = products.filter(
    (p) => stockTone(p.stockQty, p.reorderLevel).tone === "bad",
  );

  const today = ledger.filter((l) => {
    const t = new Date(l.createdAt).getTime();
    return (
      t >= startOfTodayKarachi().getTime() && t < endOfTodayKarachi().getTime()
    );
  });
  const inwardToday = today
    .filter((l) => l.delta > 0)
    .reduce((s, l) => s + l.delta, 0);
  const outwardToday = today
    .filter((l) => l.delta < 0)
    .reduce((s, l) => s - l.delta, 0);
  const netToday = inwardToday - outwardToday;

  return (
    <OfficeChrome
      title="Stock"
      subtitle={`${products.length} SKUs · ${brands.length} brands`}
      actions={
        <>
          <input
            className="search"
            placeholder="Product, SKU or brand"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search stock"
          />
          <button
            type="button"
            className="btn-sec"
            onClick={() => setSheet("adjust")}
          >
            Adjust
          </button>
        </>
      }
    >
      {error && <p className="muted">{error}</p>}
      <div className="kpis">
        <div className="kpi">
          <p className="klab">Stock value</p>
          <p className="kval">
            <CountUp value={stockValue} money />
          </p>
          <p className="kdelta">at rate · {products.length} SKUs</p>
        </div>
        <div className="kpi">
          <p className="klab">Units on hand</p>
          <p className="kval num">
            <CountUp value={units} />
          </p>
          <p className="kdelta">
            {brands.length > 0 ? `across ${brands.length} brands` : "no brands set"}
          </p>
        </div>
        <div className="kpi">
          <p className="klab">Low stock</p>
          <p className="kval num">
            <CountUp value={low.length} />
          </p>
          <p className="kdelta">{low[0]?.name ?? "All above reorder"}</p>
        </div>
        <div className="kpi">
          <p className="klab">Out of stock</p>
          <p className="kval num">
            <CountUp value={out.length} />
          </p>
          <p className="kdelta">{out[0]?.name ?? "Nothing out"}</p>
        </div>
      </div>
      <div
        className="row"
        style={{ gap: 16, alignItems: "stretch", flex: 1, minHeight: 0 }}
      >
        <div className="card2 grow is-fill">
          <div className="chips" style={{ marginBottom: 12 }}>
            <button
              type="button"
              className={`chip${brand === "" ? " is-on" : ""}`}
              onClick={() => setBrand("")}
            >
              All brands
            </button>
            {brands.map((b) => (
              <button
                key={b}
                type="button"
                className={`chip${brand === b ? " is-on" : ""}`}
                onClick={() => setBrand(b)}
              >
                {b}
              </button>
            ))}
          </div>
          <div className="tbl-wrap" style={{ flex: 1, minHeight: 0 }}>
            <table className="tbl tight">
              <thead>
                <tr>
                  <th>Brand</th>
                  <th>Product</th>
                  <th className="r">On hand</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const st = stockTone(p.stockQty, p.reorderLevel);
                  return (
                    <tr key={p.id}>
                      <td className="sku">{brandOf(p) || "—"}</td>
                      <td>
                        <span className="pname">{p.name}</span>
                        <br />
                        <span className="pmeta">{p.sku}</span>
                      </td>
                      <td className="r num">
                        {p.stockQty} {p.unit}
                      </td>
                      <td>
                        <StatusPill label={st.label} tone={st.tone} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="tbl-empty">No stock matches this filter.</p>
            )}
          </div>
        </div>
        <div
          className="card2"
          style={{ width: 288, flex: "none", display: "flex", flexDirection: "column", minHeight: 0 }}
        >
          <div className="card2-h">
            <p className="ptitle-s">Stock movements</p>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => setSheet("ledger")}
            >
              Ledger
            </button>
          </div>
          <div className="stat-list" style={{ marginBottom: 10 }}>
            <div className="stat-line">
              <span className="l">Inward today</span>
              <span className="v" style={{ color: "var(--ok-fg)" }}>
                <CountUp value={inwardToday} prefix="+" />
              </span>
            </div>
            <div className="stat-line">
              <span className="l">Outward today</span>
              <span className="v">
                <CountUp value={outwardToday} prefix="−" />
              </span>
            </div>
            <div className="stat-line">
              <span className="l">Net change</span>
              <span className="v">
                <CountUp
                  value={Math.abs(netToday)}
                  prefix={netToday < 0 ? "−" : netToday > 0 ? "+" : ""}
                />
              </span>
            </div>
          </div>
          <div
            className="feed"
            style={{ flex: 1, minHeight: 0, overflowY: "auto", scrollbarWidth: "thin" }}
          >
            {ledger.slice(0, 20).map((l) => (
              <div key={l.id} className="feed-row">
                <span
                  className="feed-dot"
                  style={{ background: dotColor(l) }}
                ></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="feed-t">
                    {l.product.name}{" "}
                    <span
                      className="num"
                      style={{
                        color: l.delta > 0 ? "var(--ok-fg)" : undefined,
                      }}
                    >
                      {l.delta > 0 ? `+${l.delta}` : `−${Math.abs(l.delta)}`}
                    </span>
                  </p>
                  <p className="feed-m">
                    {REASON_LABEL[l.reason] ?? l.reason}
                    {l.refType ? ` · ${l.refType}` : ""} ·{" "}
                    {TIME_KHI.format(new Date(l.createdAt))}
                  </p>
                </div>
              </div>
            ))}
            {ledger.length === 0 && (
              <p className="tbl-empty">No movements yet.</p>
            )}
          </div>
        </div>
      </div>

      {sheet === "adjust" && (
        <SideSheet
          title="Adjust stock"
          variant="sheet"
          onClose={() => setSheet(null)}
        >
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
                    {p.sku} · {p.name}
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
        </SideSheet>
      )}

      {sheet === "ledger" && (
        <SideSheet title="Movement ledger" onClose={() => setSheet(null)}>
          <div className="feed">
            {ledger.map((l) => (
              <div key={l.id} className="feed-row">
                <span
                  className="feed-dot"
                  style={{ background: dotColor(l) }}
                ></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="feed-t">
                    {l.product.name}{" "}
                    <span
                      className="num"
                      style={{
                        color: l.delta > 0 ? "var(--ok-fg)" : undefined,
                      }}
                    >
                      {l.delta > 0 ? `+${l.delta}` : `−${Math.abs(l.delta)}`}
                    </span>
                  </p>
                  <p className="feed-m">
                    {REASON_LABEL[l.reason] ?? l.reason}
                    {l.refType ? ` · ${l.refType}` : ""} ·{" "}
                    {DATE_KHI.format(new Date(l.createdAt))}{" "}
                    {TIME_KHI.format(new Date(l.createdAt))} · bal{" "}
                    {l.balanceAfter}
                  </p>
                </div>
              </div>
            ))}
            {ledger.length === 0 && (
              <p className="tbl-empty">No movements yet.</p>
            )}
          </div>
        </SideSheet>
      )}
    </OfficeChrome>
  );
}
