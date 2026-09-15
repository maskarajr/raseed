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

  if (error) return <p className="muted" style={{ padding: 32 }}>{error}</p>;
  if (!inv) return <p className="muted" style={{ padding: 32 }}>Loading…</p>;

  const returnsTotal = inv.returns.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="doc">
      <div className="doc-head">
        <div>
          <p className="eyebrow">Raseed</p>
          <h1 className="doc-t">Invoice</h1>
        </div>
        <div className="r">
          <p className="sku">{inv.code}</p>
          <p className="meta">
            {new Date(inv.createdAt).toLocaleString("en-PK", {
              timeZone: "Asia/Karachi",
            })}
          </p>
          <p className="meta">Order {inv.order.code}</p>
        </div>
      </div>
      <dl className="dl">
        <div>
          <dt>Bill to</dt>
          <dd>
            {inv.order.customer.name}
            <br />
            {inv.order.customer.phone}
            <br />
            {inv.order.customer.area ?? ""} {inv.order.customer.address ?? ""}
          </dd>
        </div>
        <div>
          <dt>Booked by</dt>
          <dd>{inv.order.booker.name}</dd>
        </div>
      </dl>
      <table className="tbl">
        <thead>
          <tr>
            <th>#</th>
            <th>Item</th>
            <th className="r">Qty</th>
            <th className="r">Unit</th>
            <th className="r">Amount</th>
          </tr>
        </thead>
        <tbody>
          {inv.order.items.map((i, idx) => (
            <tr key={i.id}>
              <td>{idx + 1}</td>
              <td>
                <span className="sku">{i.product.sku}</span> {i.product.name}
              </td>
              <td className="num r">
                {i.qty} {i.product.unit}
              </td>
              <td className="money">
                <Money value={i.unitPrice} />
              </td>
              <td className="money">
                <Money value={i.qty * i.unitPrice} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="totals">
        <div className="trow">
          <span>Subtotal</span>
          <Money value={inv.order.subtotal} />
        </div>
        <div className="trow">
          <span>Returns</span>
          <span>
            {returnsTotal > 0 ? "−" : ""}
            <Money value={returnsTotal} />
          </span>
        </div>
        <div className="trow">
          <span>Collected</span>
          <Money value={inv.amountPaid} />
        </div>
        <div className="trow grand">
          <span>Balance due</span>
          <Money value={inv.balance} />
        </div>
      </div>
      <p className="meta" style={{ textAlign: "center" }}>
        Currency: PKR · cash only
      </p>
      <div className="no-print" style={{ textAlign: "center" }}>
        <button className="btn-primary" onClick={() => window.print()}>
          Print
        </button>
      </div>
    </div>
  );
}
