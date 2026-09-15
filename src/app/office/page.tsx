"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { OfficeChrome } from "@/components/OfficeChrome";
import { StatusPill } from "@/components/badges";
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
    status: string;
    createdAt: string;
    booker: string;
    customer: string;
    subtotal: number;
    items: number;
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
          <p className="kdelta">{kpis.awaitingConfirm} awaiting confirm</p>
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

      <div className="card2 grow" style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
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
                  <th className="r">Items</th>
                  <th className="r">Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.submitted.map((o) => (
                  <tr key={o.id}>
                    <td className="sku">
                      <Link href={`/office/orders/${o.id}`}>{o.code}</Link>
                    </td>
                    <td>{o.customer}</td>
                    <td>{o.booker}</td>
                    <td className="r num">{o.items}</td>
                    <td className="money">
                      <Money value={o.subtotal} />
                    </td>
                    <td>
                      <StatusPill status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </OfficeChrome>
  );
}
