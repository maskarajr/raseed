"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { SideSheet } from "@/components/SideSheet";
import { useToast } from "@/components/Toast";
import type { CollectPaymentKind, PaymentMode } from "@/lib/enums";

export function PaymentSheet({
  invoiceId,
  invoiceCode,
  balance,
  onClose,
  onDone,
}: {
  invoiceId: string;
  invoiceCode?: string;
  balance: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [kind, setKind] = useState<CollectPaymentKind>("part");
  const [mode, setMode] = useState<PaymentMode>("cash");
  const [amount, setAmount] = useState(String(Math.min(balance, 20000)));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const posted = kind === "full" ? balance : Number(amount);

  function kindLabel(k: CollectPaymentKind): string {
    switch (k) {
      case "full":
        return "Full settlement";
      case "part":
        return "Part payment";
      default: {
        const _exhaustive: never = k;
        return _exhaustive;
      }
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await api<{ invoice: { balance: number } }>("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          invoiceId,
          amount: posted,
          mode,
          kind,
        }),
      });
      toast(
        `${kindLabel(kind)} of Rs ${posted.toLocaleString("en-PK")} recorded${invoiceCode ? ` · ${invoiceCode}` : ""} balance Rs ${res.invoice.balance.toLocaleString("en-PK")}`,
      );
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
      setSaving(false);
    }
  }

  return (
    <SideSheet
      title={`Record payment${invoiceCode ? ` · ${invoiceCode}` : ""}`}
      onClose={onClose}
      variant="sheet"
    >
      <form onSubmit={save} className="stack">
        <p className="muted">
          Outstanding: <Money value={balance} />
        </p>
        <div className="lfield">
          <label>Payment type</label>
          <div className="chips">
            {(
              [
                ["part", "Part payment"],
                ["full", "Full settlement"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`chip${kind === id ? " is-on" : ""}`}
                onClick={() => {
                  setKind(id);
                  if (id === "full") setAmount(String(balance));
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="lfield">
          <label>Amount collected</label>
          <input
            className="linput"
            type="number"
            min={1}
            max={balance}
            value={kind === "full" ? balance : amount}
            disabled={kind === "full"}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div className="lfield">
          <label>Method</label>
          <div className="chips">
            {(
              [
                ["cash", "Cash"],
                ["bank", "Bank"],
                ["cheque", "Cheque"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`chip${mode === id ? " is-on" : ""}`}
                onClick={() => setMode(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="meta">Cash, bank, or cheque — never credit terms.</p>
        </div>
        {error && <p className="muted">{error}</p>}
        <div className="row" style={{ gap: 10 }}>
          <button type="button" className="btn-sec grow" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary grow"
            disabled={saving || balance <= 0}
          >
            {saving ? "Recording…" : "Record payment"}
          </button>
        </div>
      </form>
    </SideSheet>
  );
}
