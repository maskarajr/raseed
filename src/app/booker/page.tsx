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
};

const CLOSED = ["settled", "cancelled"];

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function sevenDaysAgo() {
  return Date.now() - 7 * 24 * 60 * 60 * 1000;
}

export default function BookerHome() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ orders: OrderRow[] }>("/api/orders")
      .then((d) => setOrders(d.orders))
      .catch((e) => setError(e.message));
  }, []);

  const todayStart = startOfToday();
  const weekStart = sevenDaysAgo();
  const todayBooked = orders
    .filter((o) => new Date(o.createdAt).getTime() >= todayStart)
    .reduce((s, o) => s + o.subtotal, 0);
  const weekBooked = orders
    .filter((o) => new Date(o.createdAt).getTime() >= weekStart)
    .reduce((s, o) => s + o.subtotal, 0);
  const openOrders = orders.filter((o) => !CLOSED.includes(o.status)).length;

  const recent = orders.slice(0, 6);

  return (
    <div className="space-y-4 px-4 pt-5">
      <div className="flex items-center justify-between">
        <span className="text-2xl font-bold text-primary">Raseed</span>
        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">
          Booker
        </span>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="grid grid-cols-3 gap-2">
        <Metric label="Today booked">
          <Money value={todayBooked} className="text-base font-bold" />
        </Metric>
        <Metric label="Open orders">
          <span className="tnum text-base font-bold">{openOrders}</span>
        </Metric>
        <Metric label="This week">
          <Money value={weekBooked} className="text-base font-bold" />
        </Metric>
      </div>

      <Link
        href="/booker/orders/new"
        className="btn-primary min-h-[52px] w-full text-base"
      >
        + New order
      </Link>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Recent orders</h2>
          <Link href="/booker/orders" className="text-sm text-primary">
            See all
          </Link>
        </div>
        <div className="space-y-2">
          {recent.map((o) => (
            <Link
              key={o.id}
              href="/booker/orders"
              className="card flex items-center justify-between p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{o.customer.name}</p>
                <p className="text-xs text-muted">
                  <span className="font-mono">{o.code}</span> ·{" "}
                  <Money value={o.subtotal} />
                </p>
              </div>
              <StatusPill status={o.status} />
            </Link>
          ))}
          {recent.length === 0 && (
            <p className="py-6 text-center text-sm text-muted">
              No orders yet. Tap “New order”.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-3">
      <p className="text-[11px] leading-tight text-muted">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
