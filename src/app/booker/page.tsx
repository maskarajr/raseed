"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { StatusPill } from "@/components/badges";
import { BookerChrome } from "@/components/BookerChrome";
import { startOfTodayKarachi, startOfWeekKarachi } from "@/lib/day";

type OrderRow = {
  id: string;
  code: string;
  status: string;
  subtotal: number;
  createdAt: string;
  customer: { name: string; area: string | null };
  invoice: { paymentStatus: string; balance?: number } | null;
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
  const todayOrders = orders.filter(
    (o) => new Date(o.createdAt).getTime() >= todayStart,
  );
  const todayBooked = todayOrders.reduce((s, o) => s + o.subtotal, 0);
  const weekBooked = orders
    .filter((o) => new Date(o.createdAt).getTime() >= weekStart)
    .reduce((s, o) => s + o.subtotal, 0);
  const collectedAmt = orders
    .filter(
      (o) =>
        o.status === "settled" ||
        o.invoice?.paymentStatus === "paid" ||
        (o.invoice != null && (o.invoice.balance ?? 1) <= 0),
    )
    .reduce((s, o) => s + o.subtotal, 0);
  const pct =
    todayBooked > 0
      ? Math.min(100, Math.round((collectedAmt / todayBooked) * 100))
      : 0;
  const first = name?.split(" ")[0] ?? "Booker";
  const nextStops = orders
    .filter((o) => {
      if (CLOSED.includes(o.status)) return false;
      if (o.invoice?.paymentStatus === "paid") return false;
      if (o.invoice != null && (o.invoice.balance ?? 1) <= 0) return false;
      return true;
    })
    .slice(0, 3);

  return (
    <BookerChrome title={`Salaam, ${first}`}>
      {error && <p className="muted">{error}</p>}
      <div className="pcard">
        <p className="ptitle-s">Today's orders</p>
        <div className="rowb" style={{ marginTop: 6, alignItems: "flex-end" }}>
          <span className="pbig num">{todayOrders.length}</span>
          <span style={{ textAlign: "right" }}>
            <span className="num" style={{ fontSize: 15, display: "block" }}>
              <Money value={todayBooked} />
            </span>
            <span className="pmeta">Week <Money value={weekBooked} /></span>
          </span>
        </div>
      </div>
      <div className="pcard">
        <div className="rowb" style={{ marginBottom: 6 }}>
          <p className="ptitle-s">Collections</p>
          <span className="pmeta">vs booked</span>
        </div>
        <div className="rowb" style={{ marginTop: 8 }}>
          <span className="pname">
            <Money value={collectedAmt} /> collected
          </span>
          <StatusPill status="on track" />
        </div>
        <div
          style={{
            height: 6,
            background: "var(--border)",
            borderRadius: 999,
            marginTop: 10,
          }}
        >
          <div
            style={{
              height: 6,
              width: `${pct}%`,
              background: "var(--accent)",
              borderRadius: 999,
            }}
          />
        </div>
        <p className="pmeta" style={{ marginTop: 6 }}>
          {pct}% of <Money value={todayBooked} />
        </p>
      </div>
      <div className="row" style={{ gap: 10 }}>
        <Link
          href="/booker/orders/new"
          className="btn-primary grow"
          style={{ justifyContent: "center" }}
        >
          New order
        </Link>
        <Link href="/booker/orders" className="btn-sec">
          Collect
        </Link>
      </div>
      <div className="pcard" style={{ flex: "1 0 auto" }}>
        <p className="ptitle-s" style={{ marginBottom: 4 }}>
          Next stops
        </p>
        {nextStops.map((o) => (
          <Link key={o.id} href="/booker/orders" className="prow">
            <span>
              <span className="pname">{o.customer.name}</span>
              <br />
              <span className="pmeta">{o.customer.area ?? o.code}</span>
            </span>
            <StatusPill status={o.status} />
          </Link>
        ))}
        {nextStops.length === 0 && (
          <p className="tbl-empty">No open stops.</p>
        )}
      </div>
    </BookerChrome>
  );
}
