"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { OfficeChrome } from "@/components/OfficeChrome";
import { StatusPill } from "@/components/badges";

type ReportsResponse = {
  sales: {
    invoiceCount: number;
    totalSales: number;
    totalCollected: number;
    totalOutstanding: number;
    byDay: { day: string; sales: number; invoices: number }[];
  };
  topSkus: { sku: string; name: string; qty: number; revenue: number }[];
  stock: {
    id: string;
    sku: string;
    name: string;
    stockQty: number;
    lowStock: boolean;
  }[];
  bookers: {
    id: string;
    name: string;
    orderCount: number;
    salesValue: number;
  }[];
};

export default function ReportsPage() {
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const qs = params.toString();
      const d = await api<ReportsResponse>(
        `/api/reports${qs ? `?${qs}` : ""}`,
      );
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <OfficeChrome title="Reports">
        <p className="muted">{error}</p>
      </OfficeChrome>
    );
  }
  if (!data) {
    return (
      <OfficeChrome title="Reports">
        <p className="muted">Loading…</p>
      </OfficeChrome>
    );
  }

  const avg =
    data.sales.invoiceCount > 0
      ? Math.round(data.sales.totalSales / data.sales.invoiceCount)
      : 0;

  return (
    <OfficeChrome title="Reports" subtitle="Collections vs booked">

      <div className="card flex flex-wrap items-end gap-3">
        <div>
          <label className="label">From</label>
          <input
            type="date"
            className="input"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="label">To</label>
          <input
            type="date"
            className="input"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <button className="btn-primary" onClick={load}>
          Apply
        </button>
      </div>

      <div className="kpis">
        <div className="kpi">
          <p className="klab">Orders</p>
          <p className="kval num">{data.sales.invoiceCount}</p>
        </div>
        <div className="kpi">
          <p className="klab">Value</p>
          <p className="kval">
            <Money value={data.sales.totalSales} />
          </p>
          <p className="kdelta">Avg <Money value={avg} /> / invoice</p>
        </div>
        <div className="kpi">
          <p className="klab">Collections</p>
          <p className="kval">
            <Money value={data.sales.totalCollected} />
          </p>
        </div>
        <div className="kpi">
          <p className="klab">Returns / outstanding</p>
          <p className="kval">
            <Money value={data.sales.totalOutstanding} />
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-semibold">Sales by day</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Day</th>
                <th>Invoices</th>
                <th>Sales</th>
              </tr>
            </thead>
            <tbody>
              {data.sales.byDay.map((d) => (
                <tr key={d.day}>
                  <td>{d.day}</td>
                  <td className="tnum">{d.invoices}</td>
                  <td><Money value={d.sales} /></td>
                </tr>
              ))}
              {data.sales.byDay.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center text-slate-500">
                    No sales in range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold">Top SKUs</h2>
          <table className="table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>Qty sold</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.topSkus.map((s) => (
                <tr key={s.sku}>
                  <td className="font-mono text-xs">{s.sku}</td>
                  <td>{s.name}</td>
                  <td className="tnum">{s.qty}</td>
                  <td><Money value={s.revenue} /></td>
                </tr>
              ))}
              {data.topSkus.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-slate-500">
                    No sales yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold">Current stock / low stock</h2>
          <table className="table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>Qty</th>
                <th>Flag</th>
              </tr>
            </thead>
            <tbody>
              {data.stock.map((s) => (
                <tr key={s.id}>
                  <td className="font-mono text-xs">{s.sku}</td>
                  <td>{s.name}</td>
                  <td className={s.lowStock ? "font-semibold text-red-600" : ""}>
                    {s.stockQty}
                  </td>
                  <td>
                    {s.lowStock ? <StatusPill status="low" /> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold">Booker leaderboard</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Booker</th>
                <th>Orders</th>
                <th>Sales value</th>
              </tr>
            </thead>
            <tbody>
              {data.bookers.map((b) => (
                <tr key={b.id}>
                  <td>{b.name}</td>
                  <td className="tnum">{b.orderCount}</td>
                  <td><Money value={b.salesValue} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </OfficeChrome>
  );
}
