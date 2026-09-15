"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { StatusPill } from "@/components/badges";
import { OfficeChrome } from "@/components/OfficeChrome";
import { statusUi } from "@/lib/status";

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

const CHIPS = [
  { label: "All", term: "" },
  { label: "To collect", term: "to collect" },
  { label: "Paid", term: "paid" },
  { label: "Draft", term: "draft" },
];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [term, setTerm] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    api<{ invoices: InvoiceRow[] }>("/api/invoices")
      .then((d) => setInvoices(d.invoices))
      .catch((e) => setError(e.message));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((i) => {
      const hay =
        `${i.code} ${i.order.code} ${i.order.customer.name} ${statusUi(i.paymentStatus).label}`.toLowerCase();
      if (term && !hay.includes(term)) return false;
      if (q && !hay.includes(q)) return false;
      return true;
    });
  }, [invoices, term, search]);

  return (
    <OfficeChrome title="Invoices" subtitle={`${filtered.length} shown`}>
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
      <div className="card2">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Order</th>
                <th>Customer</th>
                <th className="r">Total</th>
                <th className="r">Collected</th>
                <th className="r">Balance due</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id}>
                  <td className="sku">{i.code}</td>
                  <td className="sku">{i.order.code}</td>
                  <td>{i.order.customer.name}</td>
                  <td className="money">
                    <Money value={i.total} />
                  </td>
                  <td className="money">
                    <Money value={i.amountPaid} />
                  </td>
                  <td className="money">
                    <Money value={i.balance} />
                  </td>
                  <td>
                    <StatusPill status={i.paymentStatus} />
                  </td>
                  <td>
                    <Link
                      href={`/office/invoices/${i.id}`}
                      className="btn-ghost btn-sm"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="tbl-empty">No invoices.</p>}
        </div>
      </div>
    </OfficeChrome>
  );
}
