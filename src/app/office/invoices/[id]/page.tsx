"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client";
import { InvoicePaper } from "@/components/InvoiceDocument";
import {
  PaymentSheet,
  ReturnSheet,
  type InvoiceDetail,
} from "@/components/InvoiceActions";

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [inv, setInv] = useState<InvoiceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"payment" | "return" | null>(null);

  async function load() {
    try {
      const { invoice } = await api<{ invoice: InvoiceDetail }>(
        `/api/invoices/${id}`,
      );
      setInv(invoice);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error && !inv) return <p className="text-danger">{error}</p>;
  if (!inv) return <p className="text-muted">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/office/invoices" className="text-sm text-primary">
          ← Invoices
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/office/invoices/${inv.id}/print`}
            className="btn-secondary"
          >
            Print / PDF
          </Link>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setSheet("payment")}
          >
            Record payment
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setSheet("return")}
          >
            Log return
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <InvoicePaper inv={inv} />

      {sheet === "payment" && (
        <PaymentSheet
          invoiceId={inv.id}
          balance={inv.balance}
          onClose={() => setSheet(null)}
          onDone={() => {
            setSheet(null);
            load();
          }}
        />
      )}
      {sheet === "return" && (
        <ReturnSheet
          invoice={inv}
          onClose={() => setSheet(null)}
          onDone={() => {
            setSheet(null);
            load();
          }}
        />
      )}
    </div>
  );
}
