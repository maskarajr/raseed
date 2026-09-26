"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { CountUp } from "@/components/CountUp";
import { OfficeChrome } from "@/components/OfficeChrome";
import { StatusPill } from "@/components/badges";
import { formatTodayKarachi } from "@/lib/day";
import { useToast } from "@/components/Toast";

type HomeResponse = {
  kpis: {
    bookedToday: number;
    bookedYesterday: number;
    ordersToday: number;
    outstanding: number;
    outstandingCount: number;
    collectedToday: number;
    awaitingConfirm: number;
    oldestAwaitingMins: number;
    lowStock: number;
    outOfStock: number;
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
  outstandingInvoices: {
    id: string;
    code: string;
    customer: string;
    balance: number;
  }[];
};

type SearchHit = {
  orders: { id: string; code: string; status: string; customer: { name: string } }[];
  customers: { id: string; name: string; area: string | null; route: string | null }[];
  products: { id: string; sku: string; name: string }[];
};

export default function OfficeDashboard() {
  const toast = useToast();
  const [data, setData] = useState<HomeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [today, setToday] = useState("");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit | null>(null);

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

  useEffect(() => {
    if (!q.trim()) {
      setHits(null);
      return;
    }
    const t = setTimeout(() => {
      api<SearchHit>(`/api/search?q=${encodeURIComponent(q.trim())}`)
        .then(setHits)
        .catch(() => setHits(null));
    }, 150);
    return () => clearTimeout(t);
  }, [q]);

  const filteredSubmitted = useMemo(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    if (!term) return data.submitted;
    return data.submitted.filter((o) =>
      `${o.code} ${o.customer} ${o.booker}`.toLowerCase().includes(term),
    );
  }, [data, q]);

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
  const vsY = kpis.bookedToday - kpis.bookedYesterday;

  return (
    <OfficeChrome
      title="Dashboard"
      subtitle={`${today || "…"} · office hours 09:00–19:00`}
      actions={
        <>
          <input
            className="search"
            placeholder="Search orders, customers, SKUs"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            type="button"
            className="btn-ghost"
            onClick={() =>
              toast(
                kpis.awaitingConfirm
                  ? `${kpis.awaitingConfirm} orders awaiting confirmation`
                  : "No notifications",
              )
            }
          >
            Bell
          </button>
          <Link href="/office/orders/new" className="btn-primary">
            New order
          </Link>
        </>
      }
      trailing={
        <span className="live">
          <i></i>Live
        </span>
      }
    >
      {error && <p className="muted">{error}</p>}
      <div className="kpis">
        <div className="kpi">
          <p className="klab">Booked today</p>
          <p className="kval">
            <CountUp value={kpis.bookedToday} money />
          </p>
          <p className="kdelta">
            {kpis.ordersToday} orders · {vsY >= 0 ? "+" : ""}
            <Money value={vsY} /> vs yesterday
          </p>
        </div>
        <div className="kpi">
          <p className="klab">Outstanding</p>
          <p className="kval">
            <CountUp value={kpis.outstanding} money />
          </p>
          <p className="kdelta">{kpis.outstandingCount} invoices open</p>
        </div>
        <div className="kpi">
          <p className="klab">Awaiting confirmation</p>
          <p className="kval num"><CountUp value={kpis.awaitingConfirm} /></p>
          <p className="kdelta">
            {kpis.oldestAwaitingMins
              ? `Oldest ${kpis.oldestAwaitingMins} min`
              : "Queue clear"}
          </p>
        </div>
        <div className="kpi">
          <p className="klab">Low stock SKUs</p>
          <p className="kval num"><CountUp value={kpis.lowStock} /></p>
          <p className="kdelta">{kpis.outOfStock} out of stock</p>
        </div>
      </div>

      {hits && q.trim() && (
        <div className="card2">
          <p className="ptitle-s">Search</p>
          {hits.orders.map((o) => (
            <Link key={o.id} href={`/office/orders/${o.id}`} className="prow">
              <span className="sku">{o.code}</span>
              <span>{o.customer.name}</span>
            </Link>
          ))}
          {hits.customers.map((c) => (
            <Link key={c.id} href="/office/customers" className="prow">
              <span>{c.name}</span>
              <span className="pmeta">{c.area ?? c.route}</span>
            </Link>
          ))}
          {hits.products.map((p) => (
            <Link key={p.id} href="/office/products" className="prow">
              <span className="sku">{p.sku}</span>
              <span>{p.name}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="row" style={{ alignItems: "stretch", gap: 16 }}>
        <div className="card2 grow">
          <div className="card2-h">
            <h2 className="h3s">Orders awaiting confirmation</h2>
            <Link
              href="/office/orders?chip=awaiting"
              className="btn-ghost btn-sm"
            >
              View all
            </Link>
          </div>
          {filteredSubmitted.length === 0 ? (
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
                  {filteredSubmitted.map((o) => (
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
        <aside className="card2" style={{ width: 280, flex: "none" }}>
          <div className="card2-h">
            <h2 className="h3s">To collect</h2>
            <Link href="/office/invoices?chip=to-collect" className="btn-ghost btn-sm">
              Invoices
            </Link>
          </div>
          <p className="meta">
            Collected today <Money value={kpis.collectedToday} />
          </p>
          {data.outstandingInvoices.length === 0 ? (
            <p className="tbl-empty">No outstanding invoices.</p>
          ) : (
            data.outstandingInvoices.map((inv) => (
              <Link
                key={inv.id}
                href={`/office/invoices/${inv.id}`}
                className="prow"
              >
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
