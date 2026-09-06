"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { StatusPill } from "@/components/badges";
import { ORDER_STATUSES } from "@/lib/enums";

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
  const [busyId, setBusyId] = useState<string | null>(null);

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

  async function confirm(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await api(`/api/orders/${id}/confirm`, { method: "POST" });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Confirm failed");
    } finally {
      setBusyId(null);
    }
  }

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
      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Order#</th>
              <th>Booker</th>
              <th>Customer</th>
              <th className="text-right">Items</th>
              <th className="text-right">Total</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="whitespace-nowrap text-xs text-muted">
                  {new Date(o.createdAt).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="font-mono text-xs">{o.code}</td>
                <td>{o.booker.name}</td>
                <td>
                  {o.customer.name}
                  {o.customer.area ? (
                    <span className="text-xs text-muted"> · {o.customer.area}</span>
                  ) : null}
                </td>
                <td className="tnum text-right">{o._count.items}</td>
                <td className="text-right">
                  <Money value={o.subtotal} />
                </td>
                <td>
                  <StatusPill status={o.status} />
                </td>
                <td className="whitespace-nowrap text-right">
                  {o.status === "submitted" && (
                    <button
                      className="btn-primary mr-2 h-8 px-2 py-0 text-xs"
                      disabled={busyId === o.id}
                      onClick={() => confirm(o.id)}
                    >
                      Confirm
                    </button>
                  )}
                  <Link
                    href={`/office/orders/${o.id}`}
                    className="text-sm text-primary"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-muted">
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
