"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { formatPKR } from "@/lib/money";
import { ORDER_STATUSES } from "@/lib/enums";
import { StatusBadge } from "@/components/badges";

type OrderRow = {
  id: string;
  code: string;
  status: string;
  subtotal: number;
  createdAt: string;
  customer: { name: string; area: string | null };
  booker: { name: string };
  invoice: { id: string; code: string; paymentStatus: string } | null;
  _count: { items: number };
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const q = status ? `?status=${status}` : "";
      const { orders } = await api<{ orders: OrderRow[] }>(`/api/orders${q}`);
      setOrders(orders);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Orders</h1>
        <select
          className="input max-w-xs"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-red-600">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Customer</th>
              <th>Booker</th>
              <th>Items</th>
              <th>Subtotal</th>
              <th>Status</th>
              <th>Invoice</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="font-mono text-xs">{o.code}</td>
                <td>
                  {o.customer.name}
                  {o.customer.area ? (
                    <span className="text-xs text-slate-400"> · {o.customer.area}</span>
                  ) : null}
                </td>
                <td>{o.booker.name}</td>
                <td>{o._count.items}</td>
                <td>{formatPKR(o.subtotal)}</td>
                <td>
                  <StatusBadge status={o.status} />
                </td>
                <td>
                  {o.invoice ? (
                    <Link
                      href={`/office/invoices/${o.invoice.id}`}
                      className="text-brand-600"
                    >
                      {o.invoice.code}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="text-right">
                  <Link
                    href={`/office/orders/${o.id}`}
                    className="text-sm text-brand-600"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-slate-500">
                  No orders.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
