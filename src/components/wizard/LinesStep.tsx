"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/generated/prisma/client";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { Icon } from "@/components/Icon";
import { QtyVal } from "@/components/QtyVal";

export type CartLine = {
  product: Product;
  qty: number;
  unitPrice: number;
};

export function LinesStep({
  cart,
  setCart,
}: {
  cart: CartLine[];
  setCart: React.Dispatch<React.SetStateAction<CartLine[]>>;
}) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);

  async function search(q: string) {
    const qs = q
      ? `?active=true&search=${encodeURIComponent(q)}`
      : "?active=true";
    const { products: rows } = await api<{ products: Product[] }>(
      `/api/products${qs}`,
    );
    setProducts(rows);
  }

  useEffect(() => {
    search("");
  }, []);

  function qtyOf(id: string) {
    return cart.find((l) => l.product.id === id)?.qty ?? 0;
  }

  function setQty(p: Product, qty: number) {
    setCart((prev) => {
      const next = prev.filter((l) => l.product.id !== p.id);
      if (qty <= 0) return next;
      return [...next, { product: p, qty, unitPrice: p.price }];
    });
  }

  const low = products.filter(
    (p) => p.reorderLevel != null && p.stockQty <= p.reorderLevel,
  );

  return (
    <>
      <p className="ptitle-s">Add products</p>
      <div className="lfield" style={{ margin: "10px 0" }}>
        <input
          className="linput"
          placeholder="Search SKU or name…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            search(e.target.value);
          }}
        />
      </div>
      <div className="stack" style={{ gap: 0 }}>
        {products.map((p) => {
          const n = qtyOf(p.id);
          return (
            <div
              key={p.id}
              className={`qty-row${n === 0 ? " is-zero" : ""}`}
            >
              <span className="grow">
                <span className="pname">{p.name}</span>
                <br />
                <span className="pmeta num">
                  <Money value={p.price} /> · {p.unit}
                </span>
              </span>
              <span className="qty-ctl">
                <button
                  type="button"
                  className="qty-btn"
                  aria-label={`Decrease ${p.name}`}
                  onClick={() => setQty(p, Math.max(0, n - 1))}
                >
                  <Icon name="minus" className="ic ic-sm" />
                </button>
                <QtyVal n={n} />
                <button
                  type="button"
                  className="qty-btn"
                  aria-label={`Increase ${p.name}`}
                  onClick={() => setQty(p, n + 1)}
                >
                  <Icon name="plus" className="ic ic-sm" />
                </button>
              </span>
            </div>
          );
        })}
      </div>
      {low.length > 0 && (
        <div className="warnbox" style={{ marginTop: 12 }}>
          {low[0]!.name}: {low[0]!.stockQty} left — below reorder. A soft warning
          never blocks the order.
        </div>
      )}
    </>
  );
}
