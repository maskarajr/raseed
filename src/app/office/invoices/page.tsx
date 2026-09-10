"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { StatusPill } from "@/components/badges";
import { InvoiceDocument } from "@/components/InvoiceDocument";

type InvoiceRow = {
  id: string;
  code: string;
  total: number;
  amountPaid: number;
  balance: number;
  paymentStatus: string;
  createdAt: string;
  order: { code: string; customer: { name: string } };
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  function load() {
    api<{ invoices: InvoiceRow[] }>("/api/invoices")
      .then((d) => setInvoices(d.invoices))
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-5">
      <h1 className="font-serif text-3xl font-semibold">Invoices</h1>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="overflow-x-auto border border-line bg-surface">
        <table className="table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Order</th>
              <th>Customer</th>
              <th className="text-right">Total</th>
              <th className="text-right">Paid</th>
              <th className="text-right">Balance due</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((i) => (
              <tr
                key={i.id}
                className="cursor-pointer hover:bg-canvas"
                onClick={() => setOpenId(i.id)}
              >
                <td className="font-mono text-xs">{i.code}</td>
                <td className="font-mono text-xs">{i.order.code}</td>
                <td>{i.order.customer.name}</td>
                <td className="text-right font-mono">
                  <Money value={i.total} />
                </td>
                <td className="text-right font-mono">
                  <Money value={i.amountPaid} />
                </td>
                <td className="text-right font-mono font-semibold">
                  <Money value={i.balance} />
                </td>
                <td>
                  <StatusPill status={i.paymentStatus} />
                </td>
                <td className="text-right">
                  <button
                    type="button"
                    className="text-sm text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenId(i.id);
                    }}
                  >
                    Open
                  </button>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-muted">
                  No invoices.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {openId && (
        <InvoiceDocument
          invoiceId={openId}
          onClose={() => {
            setOpenId(null);
            load();
          }}
        />
      )}
    </div>
  );
}
