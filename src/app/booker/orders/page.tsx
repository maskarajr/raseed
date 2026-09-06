"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { StatusPill } from "@/components/badges";

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
    <div className="space-y-4 px-4 pt-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">My orders</h1>
        <Link href="/booker/orders/new" className="text-sm font-medium text-primary">
          + New
        </Link>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="space-y-2">
        {orders.map((o) => (
          <div key={o.id} className="card flex items-center justify-between p-3">
            <div className="min-w-0">
              <p className="font-mono text-xs text-muted">{o.code}</p>
              <p className="truncate font-medium">{o.customer.name}</p>
              <p className="text-xs text-muted">
                {o._count.items} items · <Money value={o.subtotal} />
              </p>
            </div>
            <StatusPill status={o.status} />
          </div>
        ))}
        {orders.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">
            No orders yet. Tap “New”.
          </p>
        )}
      </div>
    </div>
  );
}
