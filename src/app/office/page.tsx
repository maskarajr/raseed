"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";

type ReportsResponse = {
  sales: {
    invoiceCount: number;
    totalSales: number;
    totalCollected: number;
    totalOutstanding: number;
  };
  stock: { id: string; sku: string; name: string; stockQty: number; lowStock: boolean }[];
  bookers: { id: string; name: string; orderCount: number; salesValue: number }[];
};

export default function OfficeDashboard() {
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<ReportsResponse>("/api/reports")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-danger">{error}</p>;
  if (!data) return <p className="text-muted">Loading…</p>;

  const lowStock = data.stock.filter((s) => s.lowStock);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Invoices" value={String(data.sales.invoiceCount)} />
        <Stat label="Total Sales" money={data.sales.totalSales} />
        <Stat label="Collected" money={data.sales.totalCollected} />
        <Stat label="Outstanding" money={data.sales.totalOutstanding} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Low stock</h2>
            <Link href="/office/products" className="text-sm text-primary">
              Products →
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-sm text-muted">Nothing below reorder level.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Name</th>
                  <th className="text-right">Qty</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((s) => (
                  <tr key={s.id}>
                    <td className="font-mono text-xs">{s.sku}</td>
                    <td>{s.name}</td>
                    <td className="tnum text-right font-semibold text-danger">
                      {s.stockQty}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Booker leaderboard</h2>
            <Link href="/office/reports" className="text-sm text-primary">
              Reports →
            </Link>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Booker</th>
                <th className="text-right">Orders</th>
                <th className="text-right">Sales</th>
              </tr>
            </thead>
            <tbody>
              {data.bookers.map((b) => (
                <tr key={b.id}>
                  <td>{b.name}</td>
                  <td className="tnum text-right">{b.orderCount}</td>
                  <td className="text-right">
                    <Money value={b.salesValue} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  money,
}: {
  label: string;
  value?: string;
  money?: number;
}) {
  return (
    <div className="card">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-xl font-bold">
        {money !== undefined ? <Money value={money} /> : value}
      </p>
    </div>
  );
}
