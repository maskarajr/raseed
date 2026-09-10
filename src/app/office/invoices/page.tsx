"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { StatusPill } from "@/components/badges";
import { InvoiceDocument } from "@/components/InvoiceDocument";
import { KpiCard } from "@/components/KpiCard";
import { Input } from "@/components/ui/input";
import { PAYMENT_STATUSES } from "@/lib/enums";
import { formatKarachiDate, isInTodayKarachi } from "@/lib/day";

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

const STATUS_FILTERS = ["all", ...PAYMENT_STATUSES] as const;

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("all");

  function load() {
    api<{ invoices: InvoiceRow[] }>("/api/invoices")
      .then((d) => setInvoices(d.invoices))
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    load();
  }, []);

  const kpis = useMemo(() => {
    const openRows = invoices.filter(
      (i) => i.paymentStatus === "unpaid" || i.paymentStatus === "partial",
    );
    const openBalance = openRows.reduce((s, i) => s + i.balance, 0);
    const paidRows = invoices.filter((i) => i.paymentStatus === "paid");
    const paidToday = paidRows.filter((i) => isInTodayKarachi(i.createdAt));
    const paidTodayRs = paidToday.reduce((s, i) => s + i.amountPaid, 0);
    const paidListRs = paidRows.reduce((s, i) => s + i.amountPaid, 0);
    return {
      openBalance,
      openCount: openRows.length,
      outstandingCount: openRows.length,
      paidTodayRs,
      paidTodayCount: paidToday.length,
      paidListRs,
      paidCount: paidRows.length,
      listCount: invoices.length,
    };
  }, [invoices]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((i) => {
      if (status !== "all" && i.paymentStatus !== status) return false;
      if (q) {
        const hay = `${i.code} ${i.order.code} ${i.order.customer.name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [invoices, search, status]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-3xl font-semibold">Invoices</h1>
        <p className="mt-0.5 text-sm text-muted">
          Issued from confirmed orders · last {invoices.length || "—"} in list
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Open"
          hint={`${kpis.openCount} unpaid or partial`}
        >
          <Money value={kpis.openBalance} />
        </KpiCard>
        <KpiCard
          label="Outstanding"
          hint="No due dates on invoices"
        >
          <span className="tnum">{kpis.outstandingCount}</span>
        </KpiCard>
        <KpiCard
          label={kpis.paidTodayCount > 0 ? "Paid today" : "Paid"}
          hint={
            kpis.paidTodayCount > 0
              ? `${kpis.paidTodayCount} fully paid, issued today`
              : `${kpis.paidCount} fully paid in this list`
          }
        >
          <Money
            value={
              kpis.paidTodayCount > 0 ? kpis.paidTodayRs : kpis.paidListRs
            }
          />
        </KpiCard>
        <KpiCard label="Invoices" hint="This list">
          <span className="tnum">{kpis.listCount}</span>
        </KpiCard>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="max-w-sm"
          placeholder="Search invoices…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input max-w-[11rem]"
          aria-label="Filter"
          value={status}
          onChange={(e) =>
            setStatus(e.target.value as (typeof STATUS_FILTERS)[number])
          }
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "Filter: All" : s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="overflow-x-auto border border-line bg-surface">
        <table className="table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Status</th>
              <th>Issued</th>
              <th>Due</th>
              <th>Customer</th>
              <th className="text-right">Total</th>
              <th className="text-right">Paid</th>
              <th className="text-right">Balance</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr
                key={i.id}
                className="cursor-pointer hover:bg-canvas"
                onClick={() => setOpenId(i.id)}
              >
                <td>
                  <span className="font-mono text-xs">{i.code}</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    Order {i.order.code}
                  </span>
                </td>
                <td>
                  <StatusPill status={i.paymentStatus} />
                </td>
                <td className="whitespace-nowrap text-sm">
                  {formatKarachiDate(i.createdAt)}
                </td>
                <td className="text-muted" title="Invoices have no due date">
                  —
                </td>
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
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center text-muted">
                  No invoices match.
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
