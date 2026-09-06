"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { formatPKR } from "@/lib/money";

type OrderRow = {
  id: string;
  status: string;
  subtotal: number;
};

const SALES_STATUSES = ["invoiced", "out_for_delivery", "delivered", "settled"];

export default function BookerHome() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ orders: OrderRow[] }>("/api/orders")
      .then((d) => setOrders(d.orders))
      .catch((e) => setError(e.message));
  }, []);

  const total = orders.length;
  const submitted = orders.filter((o) => o.status === "submitted").length;
  const salesValue = orders
    .filter((o) => SALES_STATUSES.includes(o.status))
    .reduce((s, o) => s + o.subtotal, 0);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">My day</h1>
      {error && <p className="text-red-600">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <p className="text-xs text-slate-500">My orders</p>
          <p className="text-2xl font-bold">{total}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500">Submitted</p>
          <p className="text-2xl font-bold">{submitted}</p>
        </div>
        <div className="card col-span-2">
          <p className="text-xs text-slate-500">My sales value</p>
          <p className="text-2xl font-bold">{formatPKR(salesValue)}</p>
        </div>
      </div>

      <Link href="/booker/orders/new" className="btn-primary w-full">
        + New order
      </Link>
      <Link href="/booker/customers" className="btn-secondary w-full">
        Find / add a shop
      </Link>
    </div>
  );
}
