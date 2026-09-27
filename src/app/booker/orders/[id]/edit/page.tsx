"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { Product } from "@/generated/prisma/client";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { BookerChrome } from "@/components/BookerChrome";
import { LinesStep, type CartLine } from "@/components/wizard/LinesStep";

type DraftDetail = {
  id: string;
  code: string;
  status: string;
  notes: string | null;
  advance: number;
  customer: { name: string };
  items: {
    id: string;
    productId: string;
    qty: number;
    unitPrice: number;
    product: { sku: string; name: string; unit: string; stockQty: number; reorderLevel: number | null };
  }[];
};

function asCartLine(l: DraftDetail["items"][number]): CartLine {
  const product = {
    id: l.productId,
    sku: l.product.sku,
    name: l.product.name,
    unit: l.product.unit,
    price: l.unitPrice,
    stockQty: l.product.stockQty,
    reorderLevel: l.product.reorderLevel,
  } as unknown as Product;
  return { product, qty: l.qty, unitPrice: l.unitPrice };
}

export default function EditDraftPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<DraftDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [notes, setNotes] = useState("");
  const [advance, setAdvance] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ order: DraftDetail }>(`/api/orders/${id}`)
      .then(({ order: o }) => {
        setOrder(o);
        if (o.status === "draft") {
          setCart(o.items.map(asCartLine));
          setNotes(o.notes ?? "");
          setAdvance(o.advance ?? 0);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [id]);

  const subtotal = useMemo(
    () => cart.reduce((s, l) => s + l.qty * l.unitPrice, 0),
    [cart],
  );
  const clampedAdvance = Math.max(0, Math.min(Math.floor(advance) || 0, subtotal));

  async function save() {
    setError(null);
    setSaving(true);
    try {
      await api(`/api/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          items: cart.map((l) => ({
            productId: l.product.id,
            qty: l.qty,
            unitPrice: l.unitPrice,
          })),
          notes: notes.trim() ? notes.trim() : undefined,
          advance: clampedAdvance,
        }),
      });
      router.push(`/booker/orders/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setSaving(false);
    }
  }

  if (error && !order) {
    return (
      <BookerChrome title="Edit draft" backHref={`/booker/orders/${id}`}>
        <p className="muted">{error}</p>
      </BookerChrome>
    );
  }
  if (!order) {
    return (
      <BookerChrome title="Edit draft" backHref={`/booker/orders/${id}`}>
        <p className="muted">Loading…</p>
      </BookerChrome>
    );
  }
  if (order.status !== "draft") {
    return (
      <BookerChrome title="Edit draft" backHref={`/booker/orders/${id}`}>
        <div className="pcard stack">
          <p className="h3s">{order.code} is no longer a draft.</p>
          <p className="muted">Only drafts can be edited — the office may have confirmed it.</p>
          <Link href={`/booker/orders/${id}`} className="btn-primary btn-block">
            Back to order
          </Link>
        </div>
      </BookerChrome>
    );
  }

  return (
    <BookerChrome title={`Edit ${order.code}`} backHref={`/booker/orders/${id}`}>
      <div className="pcard" style={{ marginBottom: 12 }}>
        <div className="rowb">
          <span className="prow-l">Shop</span>
          <span className="prow-v">{order.customer.name}</span>
        </div>
      </div>

      <div className="pcard">
        <LinesStep cart={cart} setCart={setCart} />
      </div>

      <div className="pcard" style={{ marginTop: 12 }}>
        <div className="lfield">
          <label htmlFor="draft-notes">Notes</label>
          <textarea
            id="draft-notes"
            className="linput"
            maxLength={500}
            rows={3}
            placeholder="Delivery notes, requests…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="rowb" style={{ marginTop: 10 }}>
          <label className="prow-l" htmlFor="draft-advance">
            Cash advance (Rs)
          </label>
          <input
            id="draft-advance"
            className="adv-num num"
            type="number"
            inputMode="numeric"
            min={0}
            max={subtotal}
            step={1}
            value={advance}
            onChange={(e) => setAdvance(Number(e.target.value) || 0)}
          />
        </div>
        {clampedAdvance !== advance && (
          <p className="muted" style={{ marginTop: 6 }}>
            Advance is capped at the order total.
          </p>
        )}
      </div>

      {error && <p className="muted" style={{ marginTop: 10 }}>{error}</p>}

      <div className="totbar">
        <div className="rowb" style={{ marginBottom: 10 }}>
          <span className="meta">
            {cart.reduce((s, l) => s + l.qty, 0)} items
          </span>
          <span className="num" style={{ fontSize: 17, fontWeight: 600 }}>
            <Money value={subtotal} />
          </span>
        </div>
        <div className="wiz-foot" style={{ paddingTop: 0 }}>
          <Link href={`/booker/orders/${id}`} className="btn-sec">
            Cancel
          </Link>
          <button
            className="btn-primary grow"
            disabled={saving || cart.length === 0}
            onClick={save}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </BookerChrome>
  );
}
