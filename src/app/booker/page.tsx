"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { StatusPill } from "@/components/badges";
import { startOfTodayKarachi, startOfWeekKarachi } from "@/lib/day";

type OrderRow = {
  id: string;
  code: string;
  status: string;
  subtotal: number;
  createdAt: string;
  customer: { name: string; area: string | null };
};

const CLOSED = ["settled", "cancelled"];

export default function BookerHome() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [name, setName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ orders: OrderRow[] }>("/api/orders")
      .then((d) => setOrders(d.orders))
      .catch((e) => setError(e.message));
    api<{ user: { name: string } | null }>("/api/auth/me")
      .then((d) => setName(d.user?.name ?? null))
      .catch(() => setName(null));
  }, []);

  const todayStart = startOfTodayKarachi().getTime();
  const weekStart = startOfWeekKarachi().getTime();
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
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="text-2xl font-bold text-primary">Raseed</span>
          {name && (
            <span className="truncate text-sm text-muted">{name}</span>
          )}
        </div>
        <span className="rounded-full border border-line bg-[#F5F5F5] px-2 py-0.5 text-xs font-medium text-muted">
          Booker
        </span>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="grid grid-cols-3 gap-2">
        <Metric label="Today's booked">
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
          <h2 className="font-semibold">My recent orders</h2>
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
            <div className="empty">
              <p className="empty-title">No orders yet</p>
              <p className="empty-copy">Tap “New order”.</p>
            </div>
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
    <div className="rounded border border-line bg-surface p-3 shadow-none">
      <p className="text-[11px] leading-tight text-muted">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
