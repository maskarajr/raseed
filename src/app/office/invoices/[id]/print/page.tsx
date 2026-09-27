"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
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
  const [biz, setBiz] = useState<{ businessName?: string } | null>(null);

  useEffect(() => {
    fetch(`/api/invoices/${id}`, { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setInv(d.invoice);
      })
      .catch((e) => setError(e.message));
    fetch("/api/settings", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => setBiz({ businessName: d.businessName }))
      .catch(() => setBiz(null));
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
          <div className="doc-brand">
            <BrandMark className="mk" />
            <p className="doc-t">{biz?.businessName ?? "Raseed"}</p>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <p className="pilllg" style={{ background: "var(--neu-bg)", color: "var(--neu-fg)" }}>
            TAX INVOICE
          </p>
          <p className="num" style={{ fontSize: 20, marginTop: 8 }}>{inv.code}</p>
          <p className="meta">
            Issued{" "}
            {new Date(inv.createdAt).toLocaleDateString("en-PK", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              timeZone: "Asia/Karachi",
            })}
          </p>
        </div>
      </div>
      <div className="row" style={{ gap: 40 }}>
        <div>
          <p className="ptitle-s">Billed to</p>
          <p className="pname" style={{ marginTop: 6 }}>{inv.order.customer.name}</p>
          <p className="meta">
            {inv.order.customer.area ?? ""} {inv.order.customer.address ?? ""}
            <br />
            {inv.order.customer.phone}
          </p>
        </div>
        <div>
          <p className="ptitle-s">Booker</p>
          <p className="pname" style={{ marginTop: 6 }}>{inv.order.booker.name}</p>
        </div>
        <div>
          <p className="ptitle-s">Collection</p>
          <p className="pname" style={{ marginTop: 6 }}>Cash on delivery</p>
          <p className="meta">Advance or part payments accepted</p>
        </div>
      </div>
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
          <span className="muted">Subtotal</span>
          <span className="num"><Money value={inv.order.subtotal} /></span>
        </div>
        {returnsTotal > 0 && (
          <div className="trow">
            <span className="muted">Returns</span>
            <span className="num">− <Money value={returnsTotal} /></span>
          </div>
        )}
        <div className="trow">
          <span className="muted">Received to date</span>
          <span className="num">− <Money value={inv.amountPaid} /></span>
        </div>
        <div className="trow grand">
          <span>To collect</span>
          <span className="num"><Money value={inv.balance} /></span>
        </div>
      </div>
      <p
        className="meta"
        style={{ marginTop: "auto", borderTop: "1px solid var(--border)", paddingTop: 12 }}
      >
        Goods remain the property of {biz?.businessName ?? "Raseed"} until paid in
        full. Queries within 7 days of receipt. · Currency PKR · Page 1 of 1
      </p>
      <div className="no-print" style={{ textAlign: "center" }}>
        <button className="btn-primary" onClick={() => window.print()}>
          Print
        </button>
      </div>
    </div>
  );
}
