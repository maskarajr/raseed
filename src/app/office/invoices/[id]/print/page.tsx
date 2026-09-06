"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/client";
import { formatPKR } from "@/lib/money";

type InvoiceDetail = {
  id: string;
  code: string;
  total: number;
  amountPaid: number;
  balance: number;
  paymentStatus: string;
  createdAt: string;
  order: {
    code: string;
    booker: { name: string };
    customer: {
      name: string;
      phone: string;
      area: string | null;
      address: string | null;
    };
    items: {
      id: string;
      qty: number;
      unitPrice: number;
      product: { sku: string; name: string; unit: string };
    }[];
  };
};

export default function InvoicePrintPage() {
  const { id } = useParams<{ id: string }>();
  const [inv, setInv] = useState<InvoiceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ invoice: InvoiceDetail }>(`/api/invoices/${id}`)
      .then((d) => setInv(d.invoice))
      .catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    if (inv) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [inv]);

  if (error) return <p className="p-8 text-red-600">{error}</p>;
  if (!inv) return <p className="p-8 text-slate-500">Loading…</p>;

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-slate-900">
      <div className="mb-6 flex items-start justify-between border-b border-slate-300 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-700">Raseed</h1>
          <p className="text-sm text-slate-500">Wholesale Distribution</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-semibold">INVOICE</h2>
          <p className="font-mono text-sm">{inv.code}</p>
          <p className="text-sm text-slate-500">
            {new Date(inv.createdAt).toLocaleString()}
          </p>
          <p className="text-sm text-slate-500">Order {inv.order.code}</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="font-semibold text-slate-500">Bill to</p>
          <p className="font-medium">{inv.order.customer.name}</p>
          <p>{inv.order.customer.phone}</p>
          <p>{inv.order.customer.area ?? ""}</p>
          <p>{inv.order.customer.address ?? ""}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-slate-500">Booked by</p>
          <p>{inv.order.booker.name}</p>
        </div>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-slate-300">
            <th className="py-2 text-left">#</th>
            <th className="py-2 text-left">Item</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2 text-right">Unit price</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {inv.order.items.map((i, idx) => (
            <tr key={i.id} className="border-b border-slate-200">
              <td className="py-2">{idx + 1}</td>
              <td className="py-2">
                <span className="font-mono text-xs text-slate-500">
                  {i.product.sku}
                </span>{" "}
                {i.product.name}
              </td>
              <td className="py-2 text-right">
                {i.qty} {i.product.unit}
              </td>
              <td className="py-2 text-right">{formatPKR(i.unitPrice)}</td>
              <td className="py-2 text-right">
                {formatPKR(i.qty * i.unitPrice)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 ml-auto w-64 space-y-1 text-sm">
        <Row label="Total" value={formatPKR(inv.total)} bold />
        <Row label="Paid" value={formatPKR(inv.amountPaid)} />
        <Row label="Balance due" value={formatPKR(inv.balance)} bold />
        <Row label="Status" value={inv.paymentStatus.toUpperCase()} />
      </div>

      <p className="mt-10 text-center text-xs text-slate-400">
        Currency: PKR · Thank you for your business.
      </p>

      <div className="no-print mt-8 text-center">
        <button className="btn-primary" onClick={() => window.print()}>
          Print
        </button>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={bold ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}
