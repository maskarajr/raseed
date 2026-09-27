"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Customer } from "@/generated/prisma/client";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { BookerChrome } from "@/components/BookerChrome";
import { Icon } from "@/components/Icon";
import { SideSheet } from "@/components/SideSheet";
import { initials } from "@/lib/person";
import { LinesStep, type CartLine } from "@/components/wizard/LinesStep";

type SubmitResult = {
  code: string;
  warnings: { sku: string; requested: number; available: number }[];
  draft?: boolean;
};

type CustomerRow = Customer & { outstanding?: number; toCollect?: number };

export default function NewOrderPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [customer, setCustomer] = useState<CustomerRow | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [advance, setAdvance] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const subtotal = cart.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const itemCount = cart.reduce((s, l) => s + l.qty, 0);
  const clampedAdvance = Math.max(0, Math.min(Math.floor(advance) || 0, subtotal));

  async function submit(asDraft = false) {
    setError(null);
    setSubmitting(true);
    try {
      const res = await api<{
        order: { code: string };
        warnings: SubmitResult["warnings"];
        balanceDue?: number;
      }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          customerId: customer!.id,
          submit: !asDraft,
          // C1 contract (ad270af): advance is server-revalidated against the
          // summed subtotal (400 'Advance (Rs A) exceeds order total (Rs T)').
          advance: clampedAdvance,
          items: cart.map((l) => ({
            productId: l.product.id,
            qty: l.qty,
            unitPrice: l.unitPrice,
          })),
        }),
      });
      setResult({ code: res.order.code, warnings: res.warnings, draft: asDraft });
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
              advance={clampedAdvance}
              onAdvanceChange={setAdvance}
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
              <>
                <button
                  className="btn-sec"
                  disabled={submitting || cart.length === 0}
                  onClick={() => submit(true)}
                >
                  Save as draft
                </button>
                <button
                  className="btn-primary grow"
                  disabled={submitting || cart.length === 0}
                  onClick={() => submit()}
                >
                  {submitting ? "Submitting…" : "Place order"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </BookerChrome>
  );
}

const STEP_LABELS = ["Shop", "Products", "Advance"] as const;

function Steps({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="wsteps" aria-label={`Step ${step} of 3`}>
      {STEP_LABELS.map((lab, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const cls = `wstep${n === step ? " is-on" : ""}${n < step ? " is-done" : ""}`;
        return (
          <div className={cls} key={lab}>
            <span className="wstep-bar" style={{ ["--i" as string]: i }}></span>
            <span className="wstep-lab">{lab}</span>
          </div>
        );
      })}
    </div>
  );
}

function CustomerStep({
  selected,
  onSelect,
}: {
  selected: CustomerRow | null;
  onSelect: (c: CustomerRow) => void;
}) {
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  async function load(q: string) {
    const query = q ? `?search=${encodeURIComponent(q)}` : "";
    const { customers: rows } = await api<{ customers: CustomerRow[] }>(
      `/api/customers${query}`,
    );
    setCustomers(rows);
  }

  useEffect(() => {
    load("");
  }, []);

  return (
    <>
      <p className="ptitle-s">Pick the shop</p>
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
        {customers.map((c) => {
          const owes = c.outstanding ?? c.toCollect ?? 0;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c)}
              className={`opt${selected?.id === c.id ? " is-on" : ""}`}
            >
              <span className="avatar">{initials(c.name)}</span>
              <span className="grow">
                <span className="pname">{c.name}</span>
                <br />
                <span className="pmeta">
                  {c.area ?? "—"}
                  {c.phone ? ` · ${c.phone}` : ""}
                </span>
              </span>
              <span className="shop-owes">
                {owes > 0 ? (
                  <>
                    <span className="status s-warn">To collect</span>
                    <span className="num"><Money value={owes} /></span>
                  </>
                ) : (
                  <>
                    <span className="status s-neu">Active</span>
                    <span className="num"><Money value={0} /></span>
                  </>
                )}
              </span>
            </button>
          );
        })}
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

function ReviewStep({
  customer,
  cart,
  subtotal,
  advance,
  onAdvanceChange,
}: {
  customer: CustomerRow;
  cart: CartLine[];
  subtotal: number;
  advance: number;
  onAdvanceChange: (n: number) => void;
}) {
  // C1 advance capture (owner seq83, Breevie ad270af): the entered advance
  // rides the create payload; the server revalidates against its own summed
  // subtotal and returns balanceDue = subtotal - advance.
  const balance = subtotal - advance;
  const owes = customer.outstanding ?? customer.toCollect ?? 0;
  return (
    <>
      <p className="ptitle-s">Advance and submit</p>
      <div className="pcard">
        <div className="prow">
          <span>{customer.name}</span>
          <span className="pmeta">
            {customer.route
              ? `Route ${customer.route}`
              : (customer.area ?? "—")}
          </span>
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
          <label htmlFor="adv-input">Cash advance taken now</label>
          <span className="adv-ctl">
            <span className="pmeta">Rs</span>
            <input
              id="adv-input"
              className="adv-num num"
              type="number"
              inputMode="numeric"
              min={0}
              max={subtotal}
              step={1}
              value={advance}
              data-rev-advance
              onChange={(e) => onAdvanceChange(Number(e.target.value) || 0)}
            />
          </span>
        </div>
      </div>
      {balance > 0 && (
        <div className="balance">
          <span>Collect on delivery</span>
          <span className="num" data-rev-balance>
            <Money value={balance} />
          </span>
        </div>
      )}
      {owes > 0 && balance > 0 && (
        <div className="warnbox">
          <Icon name="warn" className="ic ic-sm" />
          <span>
            {customer.name} already owes <Money value={owes} />. Take the
            advance now; the rest is collected when the invoice is delivered.
          </span>
        </div>
      )}
    </>
  );
}

function SuccessScreen({ result }: { result: SubmitResult }) {
  return (
    <BookerChrome title="New order" backHref="/booker">
      <div className="pcard stack">
        <p className="h3s">
          Order {result.code} {result.draft ? "saved as draft" : "submitted"}
        </p>
        <p className="muted">
          {result.draft
            ? "It stays yours until you submit it — find it under the Draft chip."
            : "The office will confirm and invoice it."}
        </p>
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
