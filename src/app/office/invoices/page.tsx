"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { formatPKR } from "@/lib/money";
import { PayBadge } from "@/components/badges";

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
      {error && <p className="text-red-600">{error}</p>}
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Order</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((i) => (
              <tr key={i.id}>
                <td className="font-mono text-xs">{i.code}</td>
                <td className="font-mono text-xs">{i.order.code}</td>
                <td>{i.order.customer.name}</td>
                <td>{formatPKR(i.total)}</td>
                <td>{formatPKR(i.amountPaid)}</td>
                <td>{formatPKR(i.balance)}</td>
                <td>
                  <PayBadge status={i.paymentStatus} />
                </td>
                <td className="text-right">
                  <Link
                    href={`/office/invoices/${i.id}`}
                    className="text-sm text-brand-600"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-slate-500">
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
