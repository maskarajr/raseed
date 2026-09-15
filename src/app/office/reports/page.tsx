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

function ymdKarachi(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function rangeDates(range: Range): { from: string; to: string; label: string } {
  const now = new Date();
  const to = ymdKarachi(now);
  const fromD = new Date(now);
  if (range === "7d") fromD.setDate(fromD.getDate() - 6);
  if (range === "month") fromD.setDate(1);
  const from = ymdKarachi(fromD);
  return { from, to, label: from === to ? from : `${from}–${to}` };
}

export default function ReportsPage() {
  const [range, setRange] = useState<Range>("month");
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("This month");

  async function load(next: Range) {
    const { from, to, label: nextLabel } = rangeDates(next);
    setLabel(nextLabel);
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

  const dates = { label };
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
