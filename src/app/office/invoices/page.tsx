"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { StatusPill } from "@/components/badges";
import { OfficeChrome } from "@/components/OfficeChrome";
import { PaymentSheet } from "@/components/PaymentSheet";
import { statusUi } from "@/lib/status";

type InvoiceRow = {
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
    customer: { name: string };
  };
};

const CHIPS = [
  { label: "All", term: "" },
  { label: "To collect", term: "to collect" },
  { label: "Paid", term: "paid" },
  { label: "Draft", term: "draft" },
];

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [term, setTerm] = useState("");
  const [search, setSearch] = useState("");
  const [pay, setPay] = useState<InvoiceRow | null>(null);

  function load() {
    api<{ invoices: InvoiceRow[] }>("/api/invoices")
      .then((d) => setInvoices(d.invoices))
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    load();
    if (new URLSearchParams(window.location.search).get("chip") === "to-collect") {
      setTerm("to collect");
    }
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((i) => {
      const hay =
        `${i.code} ${i.order.code} ${i.order.customer.name} ${i.order.booker.name} ${statusUi(i.paymentStatus).label}`.toLowerCase();
      if (term && !hay.includes(term)) return false;
      if (q && !hay.includes(q)) return false;
      return true;
    });
  }, [invoices, term, search]);

  const outstanding = filtered.reduce((s, i) => s + i.balance, 0);
  const collected = filtered.reduce((s, i) => s + i.amountPaid, 0);

  return (
    <OfficeChrome
      title="Invoices"
      subtitle={`${filtered.length} shown · outstanding ${outstanding.toLocaleString("en-PK")}`}
      actions={
        <button
          className="btn-primary"
          disabled={!invoices.some((i) => i.balance > 0)}
          onClick={() => {
            const first = invoices.find((i) => i.balance > 0);
            if (first) setPay(first);
          }}
        >
          Record payment
        </button>
      }
    >
      <div className="rowb">
        <div className="chips">
          {CHIPS.map((c) => (
            <button
              key={c.label}
              type="button"
              className={`chip${term === c.term ? " is-on" : ""}`}
              onClick={() => setTerm(c.term)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <input
          className="search"
          placeholder="Invoice or customer"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {error && <p className="muted">{error}</p>}
      <p className="meta">Collected on file <Money value={collected} /></p>
      <div className="card2">
        <div className="tbl-wrap">
          <table className="tbl store">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Booker</th>
                <th>Issued</th>
                <th className="r">Collected</th>
                <th className="r">Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr
                  key={i.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => router.push(`/office/invoices/${i.id}`)}
                >
                  <td className="sku">{i.code}</td>
                  <td>{i.order.customer.name}</td>
                  <td>{i.order.booker.name}</td>
                  <td className="meta">
                    {new Date(i.createdAt).toLocaleDateString("en-GB", {
                      timeZone: "Asia/Karachi",
                      day: "2-digit",
                      month: "short",
                    })}
                  </td>
                  <td className="money">
                    {i.amountPaid > 0 ? <Money value={i.amountPaid} /> : "—"}
                  </td>
                  <td className="money">
                    <Money value={i.total} />
                  </td>
                  <td>
                    <StatusPill status={i.paymentStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="tbl-empty">No invoices.</p>}
        </div>
      </div>
      {pay && (
        <PaymentSheet
          invoiceId={pay.id}
          invoiceCode={pay.code}
          balance={pay.balance}
          onClose={() => setPay(null)}
          onDone={() => {
            setPay(null);
            load();
          }}
        />
      )}
    </OfficeChrome>
  );
}
