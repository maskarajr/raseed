"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { OfficeChrome } from "@/components/OfficeChrome";
import { formatTodayKarachi } from "@/lib/day";

type HomeResponse = {
  kpis: {
    bookedToday: number;
    outstanding: number;
    awaitingConfirm: number;
    lowStock: number;
  };
  submitted: {
    id: string;
    code: string;
    createdAt: string;
    booker: string;
    customer: string;
    subtotal: number;
  }[];
  lowStock: {
    sku: string;
    name: string;
    stockQty: number;
    reorderLevel: number | null;
  }[];
  outstandingInvoices: {
    id: string;
    code: string;
    customer: string;
    balance: number;
  }[];
};

export default function OfficeDashboard() {
  const [data, setData] = useState<HomeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [today, setToday] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api<HomeResponse>("/api/office/home");
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    setToday(formatTodayKarachi());
    load();
  }, [load]);

  async function confirm(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await api(`/api/orders/${id}/confirm`, { method: "POST" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Confirm failed");
    } finally {
      setBusyId(null);
    }
  }

  if (error && !data) {
    return (
      <OfficeChrome title="Dashboard">
        <p className="muted">{error}</p>
      </OfficeChrome>
    );
  }
  if (!data) {
    return (
      <OfficeChrome title="Dashboard">
        <p className="muted">Loading…</p>
      </OfficeChrome>
    );
  }

  const { kpis } = data;

  return (
    <OfficeChrome
      title="Dashboard"
      subtitle={`${today || "…"} · office hours 09:00–19:00`}
      actions={
        <Link href="/office/orders" className="btn-primary">
          New order
        </Link>
      }
    >
      {error && <p className="muted">{error}</p>}
      <div className="kpis">
        <div className="kpi">
          <p className="klab">Booked today</p>
          <p className="kval">
            <Money value={kpis.bookedToday} />
          </p>
          <p className="kdelta">{data.submitted.length} awaiting confirm</p>
        </div>
        <div className="kpi">
          <p className="klab">Outstanding</p>
          <p className="kval">
            <Money value={kpis.outstanding} />
          </p>
          <p className="kdelta">{data.outstandingInvoices.length} invoices open</p>
        </div>
        <div className="kpi">
          <p className="klab">Awaiting confirmation</p>
          <p className="kval num">{kpis.awaitingConfirm}</p>
        </div>
        <div className="kpi">
          <p className="klab">Low stock SKUs</p>
          <p className="kval num">{kpis.lowStock}</p>
        </div>
      </div>

      <div className="row" style={{ alignItems: "stretch", gap: 16 }}>
        <div className="card2 grow">
          <div className="card2-h">
            <h2 className="h3s">Orders awaiting confirmation</h2>
            <Link href="/office/orders" className="btn-ghost btn-sm">
              View all
            </Link>
          </div>
          {data.submitted.length === 0 ? (
            <p className="tbl-empty">Nothing waiting.</p>
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Booker</th>
                    <th className="r">Value</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.submitted.map((o) => (
                    <tr key={o.id}>
                      <td className="sku">{o.code}</td>
                      <td>{o.customer}</td>
                      <td>{o.booker}</td>
                      <td className="money">
                        <Money value={o.subtotal} />
                      </td>
                      <td>
                        <button
                          className="btn-sec btn-sm"
                          disabled={busyId === o.id}
                          onClick={() => confirm(o.id)}
                        >
                          Confirm
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <aside className="card2" style={{ width: 280, flex: "none" }}>
          <div className="card2-h">
            <h2 className="h3s">To collect</h2>
            <Link href="/office/invoices" className="btn-ghost btn-sm">
              Invoices
            </Link>
          </div>
          {data.outstandingInvoices.length === 0 ? (
            <p className="tbl-empty">No outstanding invoices.</p>
          ) : (
            data.outstandingInvoices.map((inv) => (
              <Link key={inv.id} href={`/office/invoices/${inv.id}`} className="prow">
                <div>
                  <div className="sku">{inv.code}</div>
                  <div className="pmeta">{inv.customer}</div>
                </div>
                <Money value={inv.balance} />
              </Link>
            ))
          )}
        </aside>
      </div>
    </OfficeChrome>
  );
}
