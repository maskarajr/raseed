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
    <>
      <div className="pbar">
        <div>
          <p className="pbar-t">Raseed</p>
          <p className="pmeta">{name ?? "Booker"}</p>
        </div>
      </div>
      {error && <p className="muted">{error}</p>}
      <div className="pcard">
        <p className="ptitle-s">Today booked</p>
        <p className="pbig">
          <Money value={todayBooked} />
        </p>
        <p className="meta">
          Open {openOrders} · Week <Money value={weekBooked} />
        </p>
      </div>
      <Link href="/booker/orders/new" className="btn-primary btn-block">
        New order
      </Link>
      <div className="pcard">
        <div className="rowb">
          <h2 className="h3s">Recent</h2>
          <Link href="/booker/orders" className="btn-ghost btn-sm">
            See all
          </Link>
        </div>
        {recent.map((o) => (
          <Link key={o.id} href="/booker/orders" className="prow">
            <div>
              <p className="pname">{o.customer.name}</p>
              <p className="sku">
                {o.code} · <Money value={o.subtotal} />
              </p>
            </div>
            <StatusPill status={o.status} />
          </Link>
        ))}
        {recent.length === 0 && <p className="tbl-empty">No orders yet.</p>}
      </div>
    </>
  );
}
