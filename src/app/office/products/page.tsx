"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "@/generated/prisma/client";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { OfficeChrome } from "@/components/OfficeChrome";
import { SkelRows } from "@/components/skeletons";
import { StatusPill } from "@/components/badges";
import { SideSheet } from "@/components/SideSheet";
import { Icon } from "@/components/Icon";
import { stockTone } from "@/lib/status";
import {
  busyStart,
  busyEnd,
  lockButtonWidth,
  useBusyLong,
} from "@/lib/busy";

const CATS = ["All", "Rice", "Oil", "Grocery", "Pulses"] as const;

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("");
  const [editing, setEditing] = useState<Product | "new" | null>(null);

  async function load() {
    try {
      const { products: rows } = await api<{ products: Product[] }>(
        "/api/products",
      );
      setProducts(rows ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    load();
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("new") === "1") {
      setEditing("new");
    }
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const term = cat.toLowerCase();
    return products.filter((p) => {
      const hay = `${p.sku} ${p.name} ${p.category ?? ""}`.toLowerCase();
      if (term && !hay.includes(term)) return false;
      if (q && !hay.includes(q)) return false;
      return true;
    });
  }, [products, search, cat]);

  const active = products.filter((p) => p.active).length;

  return (
    <OfficeChrome
      title="Products"
      subtitle={
        !loaded
          ? "Loading…"
          : `${filtered.length} shown · ${active} active SKUs`
      }
      actions={
        <button
          className="btn-primary"
          onClick={() => setEditing("new")}
        >
          New product
        </button>
      }
    >
      {error && <p className="muted">{error}</p>}
      <div className="rowb">
        <div className="chips">
          {CATS.map((c) => {
            const term = c === "All" ? "" : c;
            return (
              <button
                key={c}
                type="button"
                className={`chip${cat === term ? " is-on" : ""}`}
                onClick={() => setCat(term)}
              >
                {c}
              </button>
            );
          })}
        </div>
        <input
          className="search"
          placeholder="SKU or product name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="card2 grow">
        <div className="tbl-wrap">
          <table className="tbl store">
            <thead>
              <tr>
                <th className="act"></th>
                <th>SKU</th>
                <th>Product</th>
                <th>Unit</th>
                <th>Category</th>
                <th className="r">Rate</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody className={!loaded ? "g-band" : undefined}>
              {!loaded ? (
                <>
                  <span className="sr-only">Loading products…</span>
                  <SkelRows
                    cols={[
                      { role: "figure" },
                      { role: "sku" },
                      { role: "name" },
                      { role: "word" },
                      { role: "word" },
                      { role: "money", r: true },
                      { role: "status" },
                    ]}
                  />
                </>
              ) : (
              filtered.map((p) => {
                const st = stockTone(p.stockQty, p.reorderLevel);
                return (
                  <tr key={p.id}>
                    <td className="act">
                      <button
                        type="button"
                        className="rowedit"
                        aria-label={`Edit ${p.name}`}
                        onClick={() => setEditing(p)}
                      >
                        <Icon name="edit" />
                      </button>
                    </td>
                    <td className="sku">{p.sku}</td>
                    <td>{p.name}</td>
                    <td>{p.unit}</td>
                    <td>{p.category ?? "—"}</td>
                    <td className="money">
                      <Money value={p.price} />
                    </td>
                    <td>
                      <StatusPill label={st.label} tone={st.tone} />
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
          {loaded && filtered.length === 0 && (
            <p className="tbl-empty">No products match this filter.</p>
          )}
        </div>
      </div>
      {editing && (
        <ProductForm
          product={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </OfficeChrome>
  );
}

function ProductForm({
  product,
  onClose,
  onSaved,
}: {
  product?: Product;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!product;
  const [sku, setSku] = useState(product?.sku ?? "");
  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [unit, setUnit] = useState(product?.unit ?? "pcs");
  const [price, setPrice] = useState(String(product?.price ?? ""));
  const [stockQty, setStockQty] = useState(String(product?.stockQty ?? "0"));
  const [reorderLevel, setReorderLevel] = useState(
    product?.reorderLevel != null ? String(product.reorderLevel) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const long = useBusyLong(saving);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const t0 = busyStart();
    lockButtonWidth(btnRef.current);
    setError(null);
    setSaving(true);
    try {
      if (isEdit) {
        await api(`/api/products/${product!.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name,
            category: category || null,
            unit,
            price: Number(price),
            reorderLevel: reorderLevel ? Number(reorderLevel) : null,
          }),
        });
      } else {
        await api("/api/products", {
          method: "POST",
          body: JSON.stringify({
            sku,
            name,
            category: category || undefined,
            unit,
            price: Number(price),
            stockQty: Number(stockQty),
            reorderLevel: reorderLevel ? Number(reorderLevel) : undefined,
          }),
        });
      }
      await busyEnd(t0);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      await busyEnd(t0);
      setSaving(false);
    }
  }

  return (
    <SideSheet
      title={isEdit ? "Product details" : "New product"}
      onClose={onClose}
    >
      <form onSubmit={save} className="stack">
        {isEdit ? (
          <div>
            <p className="ptitle-s">SKU</p>
            <p className="num" style={{ fontSize: 15 }}>
              {product!.sku}
            </p>
          </div>
        ) : (
          <div className="lfield">
            <label>SKU</label>
            <input
              className="linput"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              required
            />
          </div>
        )}
        <div className="lfield">
          <label>Name</label>
          <input
            className="linput"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="row" style={{ alignItems: "flex-start" }}>
          <div className="lfield grow">
            <label>Unit</label>
            <input
              className="linput"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </div>
          <div className="lfield grow">
            <label>Rate (PKR)</label>
            <input
              className="linput num"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="lfield">
          <label>Category</label>
          <input
            className="linput"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
        {!isEdit && (
          <div className="lfield">
            <label>Opening stock</label>
            <input
              className="linput"
              type="number"
              value={stockQty}
              onChange={(e) => setStockQty(e.target.value)}
            />
          </div>
        )}
        <div className="lfield">
          <label>Reorder level</label>
          <input
            className="linput"
            type="number"
            value={reorderLevel}
            onChange={(e) => setReorderLevel(e.target.value)}
          />
        </div>
        {isEdit && (
          <div className="warnbox">
            Changing the rate does not reprice orders already confirmed.
          </div>
        )}
        {error && <p className="muted">{error}</p>}
        <div className="row">
          <button type="button" className="btn-sec grow" onClick={onClose}>
            Cancel
          </button>
          <button
            ref={btnRef}
            className={`btn-primary grow${saving ? " is-busy" : ""}`}
            disabled={saving}
            aria-disabled={saving || undefined}
            aria-busy={saving || undefined}
          >
            {saving && <span className="btn-spin" />}
            {saving
              ? long
                ? "Still working…"
                : "Saving…"
              : isEdit
                ? "Save changes"
                : "Create product"}
          </button>
        </div>
      </form>
    </SideSheet>
  );
}
