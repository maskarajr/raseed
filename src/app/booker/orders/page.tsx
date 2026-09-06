"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { formatPKR } from "@/lib/money";
import { StatusBadge } from "@/components/badges";

type OrderRow = {
  id: string;
  code: string;
  status: string;
  subtotal: number;
  createdAt: string;
  customer: { name: string; area: string | null };
  _count: { items: number };
};

export default function BookerOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ orders: OrderRow[] }>("/api/orders")
      .then((d) => setOrders(d.orders))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">My orders</h1>
      {error && <p className="text-red-600">{error}</p>}
      <div className="space-y-2">
        {orders.map((o) => (
          <div key={o.id} className="card flex items-center justify-between">
            <div>
              <p className="font-mono text-xs text-slate-400">{o.code}</p>
              <p className="font-medium">{o.customer.name}</p>
              <p className="text-xs text-slate-500">
                {o._count.items} items · {formatPKR(o.subtotal)}
              </p>
            </div>
            <StatusBadge status={o.status} />
          </div>
        ))}
        {orders.length === 0 && (
          <p className="text-center text-sm text-slate-500">
            No orders yet. Tap “New” to start.
          </p>
        )}
      </div>
    </div>
  );
}
