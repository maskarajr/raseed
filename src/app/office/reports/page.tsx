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
  bookers: {
    id: string;
    name: string;
    orderCount: number;
    salesValue: number;
  }[];
};

type Range = "today" | "7d" | "month";

function rangeDates(range: Range): { from: string; to: string; label: string } {
  const to = new Date();
  const from = new Date();
  if (range === "today") {
    /* same day */
  } else if (range === "7d") {
    from.setDate(from.getDate() - 6);
  } else {
    from.setDate(1);
  }
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const label =
    range === "today"
      ? iso(to)
      : range === "7d"
        ? `${iso(from)}–${iso(to)}`
        : `${iso(from)}–${iso(to)}`;
  return { from: iso(from), to: iso(to), label };
}

export default function ReportsPage() {
  const [range, setRange] = useState<Range>("month");
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(next: Range) {
    const { from, to } = rangeDates(next);
    try {
      const d = await api<ReportsResponse>(
        `/api/reports?from=${from}&to=${to}`,
      );
      setData(d);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    load(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dates = rangeDates(range);
  const avg =
    data && data.sales.invoiceCount > 0
      ? Math.round(data.sales.totalSales / data.sales.invoiceCount)
      : 0;
  const collectPct =
    data && data.sales.totalSales > 0
      ? ((data.sales.totalCollected / data.sales.totalSales) * 100).toFixed(1)
      : "0";

  return (
    <OfficeChrome
      title="Reports"
      subtitle={`Booker performance · ${dates.label}`}
      actions={
        <>
          <div className="seg">
            {(
              [
                ["today", "Today"],
                ["7d", "7 days"],
                ["month", "This month"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`seg-item${range === id ? " is-on" : ""}`}
                onClick={() => {
                  setRange(id);
                  load(id);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <button type="button" className="btn-sec" onClick={() => window.print()}>
            Export
          </button>
        </>
      }
    >
      {error && <p className="muted">{error}</p>}
      {!data ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          <div className="kpis">
            <div className="kpi">
              <p className="klab">Orders</p>
              <p className="kval num">{data.sales.invoiceCount}</p>
              <p className="kdelta">{dates.label}</p>
            </div>
            <div className="kpi">
              <p className="klab">Value</p>
              <p className="kval">
                <Money value={data.sales.totalSales} />
              </p>
              <p className="kdelta">
                Avg <Money value={avg} /> / order
              </p>
            </div>
            <div className="kpi">
              <p className="klab">Collections</p>
              <p className="kval">
                <Money value={data.sales.totalCollected} />
              </p>
              <p className="kdelta">{collectPct}% of invoiced</p>
            </div>
            <div className="kpi">
              <p className="klab">Outstanding</p>
              <p className="kval">
                <Money value={data.sales.totalOutstanding} />
              </p>
              <p className="kdelta">To collect</p>
            </div>
          </div>
          <div className="card2 grow">
            <div className="card2-h">
              <h2 className="h3s">By booker</h2>
              <span className="meta">{data.bookers.length} active</span>
            </div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Booker</th>
                    <th className="r">Orders</th>
                    <th className="r">Value</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bookers.map((b) => (
                    <tr key={b.id}>
                      <td>{b.name}</td>
                      <td className="r num">{b.orderCount}</td>
                      <td className="money">
                        <Money value={b.salesValue} />
                      </td>
                      <td>
                        <StatusPill status="on track" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.bookers.length === 0 && (
                <p className="tbl-empty">No booker sales in range.</p>
              )}
            </div>
          </div>
        </>
      )}
    </OfficeChrome>
  );
}
