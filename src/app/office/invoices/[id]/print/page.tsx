"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { Money } from "@/components/Money";
import { methodLabel } from "@/lib/status";

type InvoiceDetail = {
  id: string;
  code: string;
  total: number;
  amountPaid: number;
  balance: number;
  paymentStatus: string;
  createdAt: string;
  deliveredAt: string | null;
  order: {
    code: string;
    subtotal: number;
    advance?: number;
    booker: { name: string; phone?: string };
    customer: {
      name: string;
      phone: string;
      area: string | null;
      address: string | null;
      route: string | null;
      ntn: string | null;
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

type Issuer = {
  businessName?: string;
  issuerAddress?: string;
  issuerPhone?: string;
  issuerNtn?: string;
  issuerStrn?: string;
};

function dayKarachi(iso: string): string {
  return new Date(iso).toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Karachi",
  });
}

export default function InvoicePrintPage() {
  const { id } = useParams<{ id: string }>();
  const [inv, setInv] = useState<InvoiceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [biz, setBiz] = useState<Issuer | null>(null);

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
      .then((d) => setBiz(d as Issuer))
      .catch(() => setBiz(null));
  }, [id]);

  // No auto-fire window.print(): a modal print dialog on mount traps the tab
  // (blocked automation and any subsequent fetch/hydrate on this and later
  // screens). Per board spec the print action lives on the user's click — the
  // Print button below — not on page mount.

  if (error) return <p className="muted" style={{ padding: 32 }}>{error}</p>;
  if (!inv) return <p className="muted" style={{ padding: 32 }}>Loading…</p>;

  const returnsTotal = inv.returns.reduce((s, r) => s + r.amount, 0);
  const cust = inv.order.customer;
  const addrLine = [cust.area, cust.address].filter(Boolean).join(", ");
  const billedSub = [
    cust.route ? `Route ${cust.route}` : null,
    cust.ntn ? `NTN ${cust.ntn}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const issuerContact = [biz?.issuerAddress, biz?.issuerPhone].filter(Boolean).join(" · ");
  const issuerReg = [
    biz?.issuerNtn ? `NTN ${biz.issuerNtn}` : null,
    biz?.issuerStrn ? `Strn ${biz.issuerStrn}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="doc">
      <div className="doc-head">
        <div>
          <div className="doc-brand">
            <BrandMark className="mk" />
            <p className="doc-t">{biz?.businessName ?? "Raseed"}</p>
          </div>
          {issuerContact && <p className="meta" style={{ marginTop: 8 }}>{issuerContact}</p>}
          {issuerReg && <p className="meta">{issuerReg}</p>}
        </div>
        <div style={{ textAlign: "right" }}>
          <p className="pilllg" style={{ background: "var(--neu-bg)", color: "var(--neu-fg)" }}>
            TAX INVOICE
          </p>
          <p className="num" style={{ fontSize: 20, marginTop: 8 }}>{inv.code}</p>
          <p className="meta">
            Issued {dayKarachi(inv.createdAt)}
            {inv.deliveredAt ? ` · Delivered ${dayKarachi(inv.deliveredAt)}` : ""}
          </p>
        </div>
      </div>
      <div className="row" style={{ gap: 40 }}>
        <div>
          <p className="ptitle-s">Billed to</p>
          <p className="pname" style={{ marginTop: 6 }}>{cust.name}</p>
          <p className="meta">
            {addrLine || "—"}
            <br />
            {billedSub || cust.phone}
          </p>
        </div>
        <div>
          <p className="ptitle-s">Booker</p>
          <p className="pname" style={{ marginTop: 6 }}>{inv.order.booker.name}</p>
          {inv.order.booker.phone && <p className="meta">{inv.order.booker.phone}</p>}
        </div>
        <div>
          <p className="ptitle-s">Collection</p>
          {/* R2 print (Figmi seq265): short method word in .pname so the
              3-column header can't wrap; the balance reminder rides the
              .pmeta sub-line. */}
          <p className="pname" style={{ marginTop: 6 }}>
            {methodLabel(
              inv.order.advance ?? 0,
              inv.total,
              inv.amountPaid,
            ).label}
          </p>
          <p className="meta">
            {inv.order.advance && inv.order.advance > 0 && inv.balance > 0
              ? `collect Rs ${inv.balance.toLocaleString("en-US")} on delivery`
              : "Advance or part payments accepted"}
          </p>
        </div>
      </div>
      <table className="tbl">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Description</th>
            <th className="r">Qty</th>
            <th className="r">Rate</th>
            <th className="r">Amount</th>
          </tr>
        </thead>
        <tbody>
          {inv.order.items.map((i) => (
            <tr key={i.id}>
              <td><span className="sku">{i.product.sku}</span></td>
              <td>
                {i.product.name}
                {i.product.unit ? ` · ${i.product.unit}` : ""}
              </td>
              <td className="num r">{i.qty}</td>
              <td className="money r">
                <Money value={i.unitPrice} />
              </td>
              <td className="money r">
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
        {inv.balance > 0 ? (
          <div className="trow grand">
            <span>To collect</span>
            <span className="num"><Money value={inv.balance} /></span>
          </div>
        ) : (
          // F1/gate 28 (Privy seq489 — print is the second office invoice
          // page): the locked debt word never prints beside a zero.
          <div className="trow grand">
            <span>Paid in full</span>
            <span className="num"><Money value={inv.amountPaid} /></span>
          </div>
        )}
      </div>
      <p
        className="meta"
        style={{ marginTop: "auto", borderTop: "1px solid var(--border)", paddingTop: 12 }}
      >
        Goods remain the property of {biz?.businessName ?? "Raseed"} until paid in
        full. Queries within 7 days of receipt. · Page 1 of 1
      </p>
      <div className="no-print" style={{ textAlign: "center" }}>
        <button className="btn-primary" onClick={() => window.print()}>
          Print
        </button>
      </div>
    </div>
  );
}
