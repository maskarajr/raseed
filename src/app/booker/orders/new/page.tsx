"use client";

import { QtyVal } from "@/components/QtyVal";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Customer, Product } from "@/generated/prisma/client";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { BookerChrome } from "@/components/BookerChrome";
import { SideSheet } from "@/components/SideSheet";
import { initials } from "@/lib/person";

type CartLine = {
  product: Product;
  qty: number;
  unitPrice: number;
};

type SubmitResult = {
  code: string;
  warnings: { sku: string; requested: number; available: number }[];
};

export default function NewOrderPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const subtotal = cart.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const itemCount = cart.reduce((s, l) => s + l.qty, 0);

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await api<{
        order: { code: string };
        warnings: SubmitResult["warnings"];
      }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          customerId: customer!.id,
          submit: true,
          items: cart.map((l) => ({
            productId: l.product.id,
            qty: l.qty,
            unitPrice: l.unitPrice,
          })),
        }),
      });
      setResult({ code: res.order.code, warnings: res.warnings });
      setSubmitting(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
      setSubmitting(false);
    }
  }

  if (result) {
    return <SuccessScreen result={result} />;
  }

  return (
    <BookerChrome
      title="New order"
      backHref="/booker"
      meta={`Step ${step} of 3`}
    >
      <div className="wiz">
        <Steps step={step} />
        {error && <p className="muted">{error}</p>}
        <div className="wiz-step" key={step}>
          {step === 1 && (
            <CustomerStep selected={customer} onSelect={setCustomer} />
          )}
          {step === 2 && <LinesStep cart={cart} setCart={setCart} />}
          {step === 3 && customer && (
            <ReviewStep
              customer={customer}
              cart={cart}
              subtotal={subtotal}
            />
          )}
        </div>
        <div className="totbar">
          <div className="rowb" style={{ marginBottom: 10 }}>
            <span className="meta">{itemCount} items</span>
            <span className="num" style={{ fontSize: 17, fontWeight: 600 }}>
              <Money value={subtotal} />
            </span>
          </div>
          <div className="wiz-foot" style={{ paddingTop: 0 }}>
            {step > 1 && (
              <button
                className="btn-sec"
                onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
              >
                Back
              </button>
            )}
            {step === 1 && (
              <button
                className="btn-primary grow"
                disabled={!customer}
                onClick={() => setStep(2)}
              >
                Continue
              </button>
            )}
            {step === 2 && (
              <button
                className="btn-primary grow"
                disabled={cart.length === 0}
                onClick={() => setStep(3)}
              >
                Continue
              </button>
            )}
            {step === 3 && (
              <button
                className="btn-primary grow"
                disabled={submitting}
                onClick={submit}
              >
                {submitting ? "Submitting…" : "Submit order"}
              </button>
            )}
          </div>
        </div>
      </div>
    </BookerChrome>
  );
}

function Steps({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="wiz-dots" aria-label={`Step ${step} of 3`}>
      {([1, 2, 3] as const).map((n) => (
        <div
          key={n}
          className={`wiz-dot${n === step ? " is-on" : ""}${n < step ? " is-done" : ""}`}
        />
      ))}
    </div>
  );
}

function CustomerStep({
  selected,
  onSelect,
}: {
  selected: Customer | null;
  onSelect: (c: Customer) => void;
}) {
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  async function load(q: string) {
    const query = q ? `?search=${encodeURIComponent(q)}` : "";
    const { customers: rows } = await api<{ customers: Customer[] }>(
      `/api/customers${query}`,
    );
    setCustomers(rows);
  }

  useEffect(() => {
    load("");
  }, []);

  return (
    <>
      <p className="ptitle-s">Step 1 · Pick the shop</p>
      <div className="lfield" style={{ margin: "10px 0" }}>
        <input
          className="linput"
          placeholder="Search shop name, phone, area…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            load(e.target.value);
          }}
        />
      </div>
      <div className="stack" style={{ gap: 8 }}>
        {customers.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c)}
            className={`opt${selected?.id === c.id ? " is-on" : ""}`}
          >
            <span className="avatar">{initials(c.name)}</span>
            <span>
              <span className="pname">{c.name}</span>
              <br />
              <span className="pmeta">
                {c.area ?? "—"}
                {c.phone ? ` · ${c.phone}` : ""}
              </span>
            </span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="btn-sec"
        style={{ marginTop: 10 }}
        onClick={() => setShowCreate(true)}
      >
        Can’t find? Add a new shop
      </button>
      {showCreate && (
        <FullScreenCustomerCreate
          onClose={() => setShowCreate(false)}
          onCreated={(c) => {
            setShowCreate(false);
            onSelect(c);
          }}
        />
      )}
    </>
  );
}

function FullScreenCustomerCreate({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (c: Customer) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { customer } = await api<{ customer: Customer }>("/api/customers", {
        method: "POST",
        body: JSON.stringify({
          name,
          phone: phone || undefined,
          area: area || undefined,
        }),
      });
      onCreated(customer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  return (
    <SideSheet title="New shop" onClose={onClose} variant="sheet">
      <form onSubmit={save} className="stack">
        <div className="lfield">
          <label>Name</label>
          <input
            className="linput"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="lfield">
          <label>Phone</label>
          <input
            className="linput"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="lfield">
          <label>Area</label>
          <input
            className="linput"
            value={area}
            onChange={(e) => setArea(e.target.value)}
          />
        </div>
        {error && <p className="muted">{error}</p>}
        <button className="btn-primary btn-block" disabled={saving}>
          {saving ? "Saving…" : "Save & continue"}
        </button>
      </form>
    </SideSheet>
  );
}

function LinesStep({
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
      <p className="ptitle-s">Step 2 · Add products</p>
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
                  onClick={() => setQty(p, Math.max(0, n - 1))}
                >
                  −
                </button>
                <QtyVal n={n} />
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setQty(p, n + 1)}
                >
                  +
                </button>
              </span>
            </div>
          );
        })}
      </div>
      {low.length > 0 && (
        <div className="warnbox" style={{ marginTop: 12 }}>
          {low[0]!.name} is low at the godown: only {low[0]!.stockQty}{" "}
          available.
        </div>
      )}
    </>
  );
}

function ReviewStep({
  customer,
  cart,
  subtotal,
}: {
  customer: Customer;
  cart: CartLine[];
  subtotal: number;
}) {
  return (
    <>
      <p className="ptitle-s">Step 3 · Review and submit</p>
      <div className="pcard">
        <div className="prow">
          <span>{customer.name}</span>
          <span className="pmeta">{customer.area ?? "—"}</span>
        </div>
        {cart.map((l) => (
          <div key={l.product.id} className="prow">
            <span>
              {l.product.name} × {l.qty}
            </span>
            <span className="num">
              <Money value={l.qty * l.unitPrice} />
            </span>
          </div>
        ))}
        <div className="prow">
          <span className="pname">Order total</span>
          <span className="num" style={{ fontWeight: 600 }}>
            <Money value={subtotal} />
          </span>
        </div>
        <div className="prow">
          <span className="pname">Collect on delivery</span>
          <span className="num" style={{ fontWeight: 600 }}>
            <Money value={subtotal} />
          </span>
        </div>
      </div>
    </>
  );
}

function SuccessScreen({ result }: { result: SubmitResult }) {
  return (
    <BookerChrome title="New order" backHref="/booker">
      <div className="pcard stack">
        <p className="h3s">Order {result.code} submitted</p>
        <p className="muted">The office will confirm and invoice it.</p>
        {result.warnings.length > 0 && (
          <div className="warnbox">
            Low stock noted (non-blocking):{" "}
            {result.warnings
              .map((w) => `${w.sku} (need ${w.requested}, have ${w.available})`)
              .join(", ")}
          </div>
        )}
        <Link href="/booker" className="btn-primary btn-block">
          Back to home
        </Link>
      </div>
    </BookerChrome>
  );
}
