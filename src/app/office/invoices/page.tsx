"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { StatusPill } from "@/components/badges";

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

  useEffect(() => {
    api<{ invoices: InvoiceRow[] }>("/api/invoices")
      .then((d) => setInvoices(d.invoices))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Invoices</h1>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="card overflow-x-auto p-0">
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
              <tr key={i.id}>
                <td className="font-mono text-xs">{i.code}</td>
                <td className="font-mono text-xs">{i.order.code}</td>
                <td>{i.order.customer.name}</td>
                <td className="text-right">
                  <Money value={i.total} />
                </td>
                <td className="text-right">
                  <Money value={i.amountPaid} />
                </td>
                <td className="text-right font-semibold">
                  <Money value={i.balance} />
                </td>
                <td>
                  <StatusPill status={i.paymentStatus} />
                </td>
                <td className="text-right">
                  <Link
                    href={`/office/invoices/${i.id}`}
                    className="text-sm text-primary"
                  >
                    Open
                  </Link>
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
    </div>
  );
}
