"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { formatPKR } from "@/lib/money";

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

  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return <p className="text-slate-500">Loading…</p>;

  const lowStock = data.stock.filter((s) => s.lowStock);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Invoices" value={String(data.sales.invoiceCount)} />
        <Stat label="Total Sales" value={formatPKR(data.sales.totalSales)} />
        <Stat label="Collected" value={formatPKR(data.sales.totalCollected)} />
        <Stat
          label="Outstanding"
          value={formatPKR(data.sales.totalOutstanding)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Low stock</h2>
            <Link href="/office/stock" className="text-sm text-brand-600">
              View stock →
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing below reorder level.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Qty</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((s) => (
                  <tr key={s.id}>
                    <td>{s.sku}</td>
                    <td>{s.name}</td>
                    <td className="font-semibold text-red-600">{s.stockQty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Booker leaderboard</h2>
            <Link href="/office/reports" className="text-sm text-brand-600">
              Reports →
            </Link>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Booker</th>
                <th>Orders</th>
                <th>Sales</th>
              </tr>
            </thead>
            <tbody>
              {data.bookers.map((b) => (
                <tr key={b.id}>
                  <td>{b.name}</td>
                  <td>{b.orderCount}</td>
                  <td>{formatPKR(b.salesValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}
