"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { CountUp } from "@/components/CountUp";
import { StatusPill } from "@/components/badges";
import { BookerChrome } from "@/components/BookerChrome";
import { startOfTodayKarachi } from "@/lib/day";

type OrderRow = {
  id: string;
  code: string;
  status: string;
  subtotal: number;
  createdAt: string;
  customer: { name: string; area: string | null; route: string | null };
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
  const todayOrders = orders.filter(
    (o) => new Date(o.createdAt).getTime() >= todayStart,
  );
  const todayBooked = todayOrders.reduce((s, o) => s + o.subtotal, 0);
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
      ? Math.min(100, Math.floor((collectedAmt / todayBooked) * 100))
      : 0;
  const first = name?.split(" ")[0] ?? "Booker";
  const openStops = orders.filter((o) => {
    if (CLOSED.includes(o.status)) return false;
    if (o.invoice?.paymentStatus === "paid") return false;
    if (o.invoice != null && (o.invoice.balance ?? 1) <= 0) return false;
    return true;
  });
  const nextStops = openStops.slice(0, 5);
  const stopsLeft = openStops.length;
  const toCollect = openStops.filter((o) => (o.invoice?.balance ?? 0) > 0).length;
  // G3/G4 (qa-v3-design-fidelity-final): the hero is route-conditional — a
  // zero-day must not render an ink hero claiming Rs 0 of Rs 0. Route chip is
  // the board's identity line `Route {n} · {N} shops`; pct floor-truncates.
  const routeNo =
    todayOrders.find((o) => o.customer.route)?.customer.route ?? null;
  const routeLabel = `Route ${routeNo ?? "—"} · ${todayOrders.length} shops`;
  const hasRouteToday = todayOrders.length > 0;

  const stopState = (o: OrderRow): { n: string; pill: string } => {
    if (o.invoice?.paymentStatus === "paid" || (o.invoice != null && (o.invoice.balance ?? 1) <= 0))
      return { n: "ok", pill: "settled" };
    if (o.status === "confirmed" || o.status === "invoiced") return { n: "warm", pill: "to collect" };
    return { n: "", pill: "scheduled" };
  };

  return (
    <BookerChrome title={`Salaam, ${first}`}>
      {error && <p className="muted">{error}</p>}
      {hasRouteToday && (
        <div className="phero">
          <div className="rowb">
            <p className="phero-lab">Collected today</p>
            <span className="phero-route">{routeLabel}</span>
          </div>
          <p className="phero-val num"><CountUp value={collectedAmt} money /></p>
          <div className="phero-bar"><span style={{ width: `${pct}%` }}></span></div>
          <div className="rowb" style={{ marginTop: 8 }}>
            <span className="phero-meta">{pct}% of <Money value={todayBooked} /> booked</span>
            <span className="phero-meta"><Money value={Math.max(0, todayBooked - collectedAmt)} /> to go</span>
          </div>
        </div>
      )}

      <div className="pstats">
        <div className="pstat"><p className="pstat-lab">Orders</p><p className="pstat-val num"><CountUp value={todayOrders.length} /></p></div>
        <div className="pstat"><p className="pstat-lab">Stops left</p><p className="pstat-val num"><CountUp value={stopsLeft} /></p></div>
        <div className="pstat"><p className="pstat-lab">To collect</p><p className="pstat-val num"><CountUp value={toCollect} /></p></div>
      </div>

      <div className="row" style={{ gap: 10 }}>
        <Link href="/booker/orders/new" className="btn-primary grow" style={{ justifyContent: "center" }}>
          New order
        </Link>
        <Link href="/booker/orders" className="btn-sec">Collect</Link>
      </div>

      <div className="pcard" style={{ flex: "1 0 auto" }}>
        <div className="rowb" style={{ marginBottom: 2 }}>
          <p className="ptitle-s">Next stops</p>
          <span className="pmeta">Ordered by route</span>
        </div>
        {nextStops.length === 0 && (
          <p className="tbl-empty">
            {hasRouteToday ? "Every stop is collected." : "No route assigned for today."}
          </p>
        )}
        {nextStops.map((o, i) => {
          const st = stopState(o);
          return (
            <div className="pstop" key={o.id}>
              <span className={`pstop-n ${st.n}`}>{i + 1}</span>
              <span className="grow">
                <Link href="/booker/orders" className="pname">{o.customer.name}</Link>
                <br />
                <span className="pmeta">
                  {o.customer.area ??
                    (o.customer.route ? `Route ${o.customer.route}` : "")}
                </span>
              </span>
              <StatusPill status={st.pill} />
            </div>
          );
        })}
      </div>
    </BookerChrome>
  );
}
