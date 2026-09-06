"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Money } from "@/components/Money";

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
    subtotal: number;
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
  returns: { id: string; amount: number }[];
};

export default function InvoicePrintPage() {
  const { id } = useParams<{ id: string }>();
  const [inv, setInv] = useState<InvoiceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/invoices/${id}`, { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setInv(d.invoice);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    if (inv) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [inv]);

  if (error) return <p className="p-8 text-danger">{error}</p>;
  if (!inv) return <p className="p-8 text-muted">Loading…</p>;

  const returnsTotal = inv.returns.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-ink">
      <div className="mb-6 flex items-start justify-between border-b border-line pb-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Raseed</h1>
          <p className="text-sm text-muted">Wholesale Distribution</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-semibold">INVOICE</h2>
          <p className="font-mono text-sm">{inv.code}</p>
          <p className="text-sm text-muted">
            {new Date(inv.createdAt).toLocaleString()}
          </p>
          <p className="text-sm text-muted">Order {inv.order.code}</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="font-semibold text-muted">Bill to</p>
          <p className="font-medium">{inv.order.customer.name}</p>
          <p>{inv.order.customer.phone}</p>
          <p>{inv.order.customer.area ?? ""}</p>
          <p>{inv.order.customer.address ?? ""}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-muted">Booked by</p>
          <p>{inv.order.booker.name}</p>
        </div>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-line">
            <th className="py-2 text-left">#</th>
            <th className="py-2 text-left">Item</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2 text-right">Unit price</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {inv.order.items.map((i, idx) => (
            <tr key={i.id} className="border-b border-line">
              <td className="py-2">{idx + 1}</td>
              <td className="py-2">
                <span className="font-mono text-xs text-muted">
                  {i.product.sku}
                </span>{" "}
                {i.product.name}
              </td>
              <td className="tnum py-2 text-right">
                {i.qty} {i.product.unit}
              </td>
              <td className="py-2 text-right">
                <Money value={i.unitPrice} />
              </td>
              <td className="py-2 text-right">
                <Money value={i.qty * i.unitPrice} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 ml-auto w-72 space-y-1 text-sm">
        <Row label="Subtotal" value={<Money value={inv.order.subtotal} />} />
        <Row
          label="Returns"
          value={
            <span>
              {returnsTotal > 0 ? "−" : ""}
              <Money value={returnsTotal} />
            </span>
          }
        />
        <Row label="Paid" value={<Money value={inv.amountPaid} />} />
        <div className="flex justify-between border-t border-line pt-2 text-base font-bold">
          <span>Balance due</span>
          <Money value={inv.balance} />
        </div>
      </div>

      <p className="mt-10 text-center text-xs text-muted">
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

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}
