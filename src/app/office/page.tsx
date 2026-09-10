"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
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
    // Render the date client-side so it reflects the viewer's "today" request
    // without a server/client hydration mismatch on the formatted string.
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

  if (error && !data) return <p className="text-danger">{error}</p>;
  if (!data) return <p className="text-muted">Loading…</p>;

  const { kpis } = data;
  const needsAttention = data.submitted.length > 0 || data.lowStock.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-normal text-ink">
          {today || "…"}
        </h1>
        <p className="mt-0.5 text-sm text-muted">Today · Asia/Karachi</p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Booked today">
          <Money value={kpis.bookedToday} variant="hero" />
        </Kpi>
        <Kpi label="Outstanding">
          <Money value={kpis.outstanding} variant="hero" />
        </Kpi>
        <Kpi label="Awaiting confirm">
          <span className="money-hero">{kpis.awaitingConfirm}</span>
        </Kpi>
        <Kpi label="Low stock">
          <span className="money-hero">{kpis.lowStock}</span>
        </Kpi>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className="card p-0">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="font-semibold">Needs attention</h2>
              <Link href="/office/orders" className="text-sm text-primary">
                All orders →
              </Link>
            </div>

            {!needsAttention ? (
              <div className="empty">
                <p className="empty-title">All clear</p>
                <p className="empty-copy">
                  Nothing to confirm and nothing below reorder level.
                </p>
              </div>
            ) : (
              <div className="space-y-6 p-4">
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    Orders awaiting confirmation ({data.submitted.length})
                  </h3>
                  {data.submitted.length === 0 ? (
                    <p className="text-sm text-muted">
                      No orders awaiting confirmation.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Time</th>
                            <th>Order#</th>
                            <th>Booker</th>
                            <th>Customer</th>
                            <th className="text-right">Total</th>
                            <th className="text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.submitted.map((o) => (
                            <tr key={o.id}>
                              <td className="whitespace-nowrap text-xs text-muted">
                                {new Date(o.createdAt).toLocaleString("en-GB", {
                                  timeZone: "Asia/Karachi",
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </td>
                              <td className="font-mono text-xs">{o.code}</td>
                              <td>{o.booker}</td>
                              <td>{o.customer}</td>
                              <td className="text-right">
                                <Money value={o.subtotal} />
                              </td>
                              <td className="whitespace-nowrap text-right">
                                <button
                                  className="btn-primary mr-2 h-8 px-2 py-0 text-xs"
                                  disabled={busyId === o.id}
                                  onClick={() => confirm(o.id)}
                                >
                                  {busyId === o.id ? "…" : "Confirm"}
                                </button>
                                <Link
                                  href={`/office/orders/${o.id}`}
                                  className="text-sm text-primary"
                                >
                                  Open
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Low stock ({data.lowStock.length})
                    </h3>
                    <Link
                      href="/office/products"
                      className="text-sm text-primary"
                    >
                      Products →
                    </Link>
                  </div>
                  {data.lowStock.length === 0 ? (
                    <p className="text-sm text-muted">
                      Nothing below reorder level.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>SKU</th>
                            <th>Name</th>
                            <th className="text-right">Qty</th>
                            <th className="text-right">Reorder</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.lowStock.map((s) => (
                            <tr key={s.sku}>
                              <td className="font-mono text-xs">{s.sku}</td>
                              <td>{s.name}</td>
                              <td className="tnum text-right font-semibold text-danger">
                                {s.stockQty}
                              </td>
                              <td className="tnum text-right text-muted">
                                {s.reorderLevel ?? "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Billing-health rail: only on very wide screens (≥1280px). */}
        <aside className="hidden xl:block">
          <section className="card p-0">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="font-semibold">Billing health</h2>
              <Link href="/office/invoices" className="text-sm text-primary">
                Invoices →
              </Link>
            </div>
            {data.outstandingInvoices.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">
                No outstanding invoices.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {data.outstandingInvoices.map((inv) => (
                  <li key={inv.id}>
                    <Link
                      href={`/office/invoices/${inv.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-canvas"
                    >
                      <span className="min-w-0">
                        <span className="block font-mono text-xs">
                          {inv.code}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {inv.customer}
                        </span>
                      </span>
                      <Money
                        value={inv.balance}
                        className="shrink-0 font-medium"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Kpi({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded border border-line bg-surface p-4 shadow-none">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl leading-tight">{children}</p>
    </div>
  );
}
