"use client";

import { useEffect, useState } from "react";
import type { Product } from "@prisma/client";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { OfficeChrome } from "@/components/OfficeChrome";
import { StatusPill } from "@/components/badges";
import { stockTone } from "@/lib/status";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    try {
      const q = search ? `?search=${encodeURIComponent(search)}` : "";
      const { products } = await api<{ products: Product[] }>(
        `/api/products${q}`,
      );
      setProducts(products);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleActive(p: Product) {
    await api(`/api/products/${p.id}`, {
      method: "PATCH",
      body: JSON.stringify({ active: !p.active }),
    });
    load();
  }

  return (
    <OfficeChrome
      title="Products"
      actions={
        <button
          className="btn-primary"
          onClick={() => {
            setShowCreate((s) => !s);
            setEditing(null);
          }}
        >
          {showCreate ? "Close" : "New product"}
        </button>
      }
    >

      {error && <p className="text-red-600">{error}</p>}

      {showCreate && (
        <ProductForm
          onSaved={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
      {editing && (
        <ProductForm
          product={editing}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      <div className="card">
        <div className="mb-3 flex gap-2">
          <input
            className="input"
            placeholder="Search SKU or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
          />
          <button className="btn-secondary" onClick={load}>
            Search
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Reorder</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs">{p.sku}</td>
                  <td>{p.name}</td>
                  <td>{p.category ?? "—"}</td>
                  <td>
                    <Money value={p.price} />
                  </td>
                  <td className="tnum">
                    {p.stockQty} {p.unit}
                  </td>
                  <td>{p.reorderLevel ?? "—"}</td>
                  <td>
                    <StatusPill
                      label={stockTone(p.stockQty, p.reorderLevel).label}
                      tone={stockTone(p.stockQty, p.reorderLevel).tone}
                    />
                    <StatusPill status={p.active ? "active" : "inactive"} />
                  </td>
                  <td className="whitespace-nowrap text-right">
                    <button
                      className="mr-2 text-sm text-primary"
                      onClick={() => {
                        setEditing(p);
                        setShowCreate(false);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="text-sm text-slate-500"
                      onClick={() => toggleActive(p)}
                    >
                      {p.active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-slate-500">
                    No products.
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

function ProductForm({
  product,
  onSaved,
}: {
  product?: Product;
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

  async function save(e: React.FormEvent) {
    e.preventDefault();
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
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="card grid grid-cols-1 gap-3 sm:grid-cols-3">
      <h2 className="col-span-full font-semibold">
        {isEdit ? `Edit ${product!.sku}` : "New product"}
      </h2>
      {!isEdit && (
        <div>
          <label className="label">SKU</label>
          <input
            className="input"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            required
          />
        </div>
      )}
      <div>
        <label className="label">Name</label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label">Category</label>
        <input
          className="input"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
      </div>
      <div>
        <label className="label">Unit</label>
        <input
          className="input"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        />
      </div>
      <div>
        <label className="label">Price (PKR)</label>
        <input
          className="input"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
      </div>
      {!isEdit && (
        <div>
          <label className="label">Opening stock</label>
          <input
            className="input"
            type="number"
            value={stockQty}
            onChange={(e) => setStockQty(e.target.value)}
          />
        </div>
      )}
      <div>
        <label className="label">Reorder level</label>
        <input
          className="input"
          type="number"
          value={reorderLevel}
          onChange={(e) => setReorderLevel(e.target.value)}
        />
      </div>
      {error && <p className="col-span-full text-sm text-red-600">{error}</p>}
      <div className="col-span-full">
        <button className="btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
