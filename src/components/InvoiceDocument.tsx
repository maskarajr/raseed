"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { StatusPill } from "@/components/badges";
import { DocumentSheet } from "@/components/DocumentSheet";
import {
  PaymentSheet,
  ReturnSheet,
  useReturnsTotal,
  type InvoiceDetail,
} from "@/components/InvoiceActions";

export function InvoicePaper({ inv }: { inv: InvoiceDetail }) {
  const returnsTotal = useReturnsTotal(inv);

  return (
    <div className="border border-line bg-surface p-6">
      <div className="mb-6 flex items-start justify-between gap-4 border-b border-line pb-4">
        <div>
          <h2 className="font-serif text-3xl font-semibold text-ink">
            {inv.code}
          </h2>
          <p className="mt-1 text-sm text-muted">
            Order {inv.order.code} · {inv.order.customer.name}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <StatusPill status={inv.paymentStatus} />
            <StatusPill status={inv.order.status} />
            {inv.returns.length > 0 && <StatusPill status="return_logged" />}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-muted">
            Balance due
          </p>
          <p className="font-serif text-3xl font-semibold text-primary">
            <Money value={inv.balance} />
          </p>
        </div>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Desc</th>
            <th className="text-right">Qty</th>
            <th className="text-right">Unit Rs</th>
            <th className="text-right">Line Rs</th>
          </tr>
        </thead>
        <tbody>
          {inv.order.items.map((i) => (
            <tr key={i.id}>
              <td className="font-mono text-xs text-muted">{i.product.sku}</td>
              <td>{i.product.name}</td>
              <td className="tnum text-right font-mono">
                {i.qty} {i.product.unit}
              </td>
              <td className="text-right font-mono">
                <Money value={i.unitPrice} />
              </td>
              <td className="text-right font-mono">
                <Money value={i.qty * i.unitPrice} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="ml-auto mt-4 w-64 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Subtotal</dt>
          <dd className="font-mono">
            <Money value={inv.order.subtotal} />
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Returns</dt>
          <dd className="font-mono text-accent">
            {returnsTotal > 0 ? "−" : ""}
            <Money value={returnsTotal} />
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Paid</dt>
          <dd className="font-mono text-success">
            {inv.amountPaid > 0 ? "−" : ""}
            <Money value={inv.amountPaid} />
          </dd>
        </div>
        <div className="flex justify-between border-t border-line pt-2">
          <dt className="font-serif text-base">Balance due</dt>
          <dd className="font-serif text-xl font-semibold text-primary">
            <Money value={inv.balance} />
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function InvoiceDocument({
  invoiceId,
  onClose,
}: {
  invoiceId: string;
  onClose: () => void;
}) {
  const [inv, setInv] = useState<InvoiceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"payment" | "return" | null>(null);

  async function load() {
    try {
      const { invoice } = await api<{ invoice: InvoiceDetail }>(
        `/api/invoices/${invoiceId}`,
      );
      setInv(invoice);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  if (error && !inv) {
    return (
      <DocumentSheet title="Invoice" onClose={onClose}>
        <p className="text-danger">{error}</p>
      </DocumentSheet>
    );
  }
  if (!inv) {
    return (
      <DocumentSheet title="Invoice" onClose={onClose}>
        <p className="text-muted">Loading…</p>
      </DocumentSheet>
    );
  }

  return (
    <>
      <DocumentSheet
        title={inv.code}
        subtitle={
          <>
            Order {inv.order.code} · {inv.order.customer.name}
          </>
        }
        onClose={onClose}
        footer={
          <>
            <Link
              href={`/office/invoices/${inv.id}/print`}
              className="btn-secondary"
            >
              Print / PDF
            </Link>
            <button className="btn-primary" onClick={() => setSheet("payment")}>
              Record payment
            </button>
            <button
              className="btn-secondary"
              onClick={() => setSheet("return")}
            >
              Log return
            </button>
          </>
        }
      >
        {error && <p className="mb-3 text-sm text-danger">{error}</p>}
        <InvoicePaper inv={inv} />
      </DocumentSheet>
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
    </>
  );
}
