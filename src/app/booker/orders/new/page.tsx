"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Customer, Product } from "@prisma/client";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { BookerChrome } from "@/components/BookerChrome";

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
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const subtotal = cart.reduce((s, l) => s + l.qty * l.unitPrice, 0);

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await api<{ order: { code: string }; warnings: SubmitResult["warnings"] }>(
        "/api/orders",
        {
          method: "POST",
          body: JSON.stringify({
            customerId: customer!.id,
            submit: true,
            notes: notes || undefined,
            items: cart.map((l) => ({
              productId: l.product.id,
              qty: l.qty,
              unitPrice: l.unitPrice,
            })),
          }),
        },
      );
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
        <div className="wiz-step">
          {step === 1 && (
            <CustomerStep
              selected={customer}
              onSelect={(c) => setCustomer(c)}
            />
          )}
          {step === 2 && (
            <LinesStep cart={cart} setCart={setCart} notes={notes} setNotes={setNotes} />
          )}
          {step === 3 && (
            <ReviewStep
              customer={customer!}
              cart={cart}
              setCart={setCart}
              notes={notes}
              subtotal={subtotal}
            />
          )}
        </div>
        <div className="totbar">
          <div className="rowb" style={{ marginBottom: 10 }}>
            <span className="meta">{cart.length} items</span>
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

// ---------------------------------------------------------------- Step 1
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
    const { customers } = await api<{ customers: Customer[] }>(
      `/api/customers${query}`,
    );
    setCustomers(customers);
  }

  useEffect(() => {
    load("");
  }, []);

  return (
    <div className="space-y-3">
      <h2 className="font-semibold">Which shop?</h2>
      {selected && (
        <div className="pcard">
          <p className="meta">Selected</p>
          <p className="pname">{selected.name}</p>
          <p className="meta">
            {selected.phone} · {selected.area ?? "—"}
          </p>
        </div>
      )}
      <input
        className="input min-h-[44px]"
        placeholder="Search shop name, phone, area…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          load(e.target.value);
        }}
      />
      <button
        className="btn-secondary min-h-[44px] w-full"
        onClick={() => setShowCreate(true)}
      >
        Can’t find? Add a new shop
      </button>
      <div className="space-y-2">
        {customers.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className={`opt${selected?.id === c.id ? " is-on" : ""}`}
          >
            <p className="font-medium">{c.name}</p>
            <p className="text-xs text-muted">
              {c.phone} · {c.area ?? "—"}
            </p>
          </button>
        ))}
      </div>

      {showCreate && (
        <FullScreenCustomerCreate
          onClose={() => setShowCreate(false)}
          onCreated={(c) => {
            setShowCreate(false);
            onSelect(c);
          }}
        />
      )}
    </div>
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
    <div className="fixed inset-0 z-40 flex flex-col bg-surface">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-lg font-bold">New shop</h2>
        <button className="text-sm text-muted" onClick={onClose}>
          Cancel
        </button>
      </div>
      <form onSubmit={save} className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <label className="label">
            Name <span className="text-danger">*</span>
          </label>
          <input
            className="input min-h-[44px]"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div>
          <label className="label">Phone</label>
          <input
            className="input min-h-[44px]"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Area</label>
          <input
            className="input min-h-[44px]"
            value={area}
            onChange={(e) => setArea(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="mt-auto">
          <button
            className="btn-primary min-h-[52px] w-full text-base"
            disabled={saving}
          >
            {saving ? "Saving…" : "Save & continue"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------- Step 2
function LinesStep({
  cart,
  setCart,
  notes,
  setNotes,
}: {
  cart: CartLine[];
  setCart: React.Dispatch<React.SetStateAction<CartLine[]>>;
  notes: string;
  setNotes: (v: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);

  async function search(q: string) {
    const query = q
      ? `?active=true&search=${encodeURIComponent(q)}`
      : "?active=true";
    const { products } = await api<{ products: Product[] }>(
      `/api/products${query}`,
    );
    setProducts(products);
  }

  useEffect(() => {
    search("");
  }, []);

  function add(p: Product) {
    setCart((prev) =>
      prev.some((l) => l.product.id === p.id)
        ? prev
        : [...prev, { product: p, qty: 1, unitPrice: p.price }],
    );
  }
  function update(id: string, patch: Partial<CartLine>) {
    setCart((prev) =>
      prev.map((l) => (l.product.id === id ? { ...l, ...patch } : l)),
    );
  }
  function remove(id: string) {
    setCart((prev) => prev.filter((l) => l.product.id !== id));
  }

  return (
    <div className="space-y-3">
      <h2 className="font-semibold">Add products</h2>
      <input
        className="input min-h-[44px]"
        placeholder="Search SKU or name…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          search(e.target.value);
        }}
      />
      <div className="max-h-44 space-y-1 overflow-y-auto">
        {products.map((p) => (
          <button
            key={p.id}
            onClick={() => add(p)}
            className="flex w-full items-center justify-between rounded border border-line px-2 py-2 text-left text-sm"
          >
            <span className="min-w-0">
              <span className="font-mono text-xs text-muted">{p.sku}</span>{" "}
              {p.name}
              <span className="ml-1 text-xs text-muted">
                (stock {p.stockQty})
              </span>
            </span>
            <Money value={p.price} className="font-medium" />
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {cart.length === 0 && (
          <p className="text-sm text-muted">No items yet — search above.</p>
        )}
        {cart.map((l) => {
          const over = l.qty > l.product.stockQty;
          return (
            <div key={l.product.id} className="card p-3">
              <div className="flex items-start justify-between">
                <p className="pr-2 text-sm font-medium">{l.product.name}</p>
                <button
                  className="text-xs text-danger"
                  onClick={() => remove(l.product.id)}
                >
                  Remove
                </button>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Stepper
                    onClick={() =>
                      update(l.product.id, { qty: Math.max(1, l.qty - 1) })
                    }
                    label="−"
                  />
                  <input
                    className="input h-11 w-14 text-center"
                    type="number"
                    min={1}
                    value={l.qty}
                    onChange={(e) =>
                      update(l.product.id, {
                        qty: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                  />
                  <Stepper
                    onClick={() => update(l.product.id, { qty: l.qty + 1 })}
                    label="+"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[11px] text-muted">Unit price</label>
                  <input
                    className="input h-11"
                    type="number"
                    min={0}
                    value={l.unitPrice}
                    onChange={(e) =>
                      update(l.product.id, {
                        unitPrice: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                  />
                </div>
              </div>
              {over && (
                <p
                  className="mt-2 rounded px-2 py-1 text-xs"
                  style={{ backgroundColor: "#FDF0E6", color: "var(--warning)" }}
                >
                  ⚠ Only {l.product.stockQty} in stock — you can still submit.
                </p>
              )}
              <p className="mt-2 text-right text-sm font-semibold">
                <Money value={l.qty * l.unitPrice} />
              </p>
            </div>
          );
        })}
      </div>

      <div>
        <label className="label">Notes (optional)</label>
        <input
          className="input min-h-[44px]"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </div>
  );
}

function Stepper({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center rounded-md border border-line bg-surface text-xl font-semibold text-ink"
      aria-label={label === "+" ? "increase" : "decrease"}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------- Step 3
function ReviewStep({
  customer,
  cart,
  setCart,
  notes,
  subtotal,
}: {
  customer: Customer;
  cart: CartLine[];
  setCart: React.Dispatch<React.SetStateAction<CartLine[]>>;
  notes: string;
  subtotal: number;
}) {
  function setQty(id: string, qty: number) {
    setCart((prev) =>
      prev.map((l) =>
        l.product.id === id ? { ...l, qty: Math.max(1, qty) } : l,
      ),
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="font-semibold">Review order</h2>
      <div className="card p-3">
        <p className="text-xs text-muted">Shop</p>
        <p className="font-medium">{customer.name}</p>
        <p className="text-xs text-muted">
          {customer.phone} · {customer.area ?? "—"}
        </p>
      </div>
      <div className="card p-0">
        {cart.map((l) => (
          <div
            key={l.product.id}
            className="flex items-center justify-between gap-3 border-b border-line px-3 py-2 last:border-0"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{l.product.name}</p>
              <p className="text-xs text-muted">
                <Money value={l.unitPrice} /> each
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Stepper
                onClick={() => setQty(l.product.id, l.qty - 1)}
                label="−"
              />
              <input
                className="input h-11 w-12 text-center"
                type="number"
                min={1}
                value={l.qty}
                onChange={(e) =>
                  setQty(l.product.id, Number(e.target.value) || 1)
                }
              />
              <Stepper
                onClick={() => setQty(l.product.id, l.qty + 1)}
                label="+"
              />
            </div>
            <Money
              value={l.qty * l.unitPrice}
              className="w-20 text-right text-sm font-medium"
            />
          </div>
        ))}
      </div>
      {notes && <p className="text-sm text-muted">Notes: {notes}</p>}
      <div className="rowb">
        <span className="pname">Total</span>
        <Money value={subtotal} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Success
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
