"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { CountUp } from "@/components/CountUp";
import { StatusPill } from "@/components/badges";
import { BookerChrome } from "@/components/BookerChrome";
import { startOfTodayKarachi } from "@/lib/day";
import { orderLabel } from "@/lib/orderLabel";
import { bookedSum, collectedSum } from "@/lib/money";
import { SkelTiles, GLine, GPerson, GPill, GS } from "@/components/skeletons";

type OrderRow = {
  id: string;
  code: string;
  status: string;
  subtotal: number;
  createdAt: string;
  customer: { name: string; area: string | null; route: string | null };
  invoice: { paymentStatus: string; balance?: number; amountPaid?: number } | null;
};

const CLOSED = ["settled", "cancelled"];

export default function BookerHome() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [name, setName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    api<{ orders: OrderRow[] }>("/api/orders")
      .then((d) => {
        setOrders(d.orders);
        setPhase("ready");
      })
      .catch((e) => {
        setError(e.message);
        setPhase("error");
      });
    api<{ user: { name: string } | null }>("/api/auth/me")
      .then((d) => setName(d.user?.name ?? null))
      .catch(() => setName(null));
  }, []);

  const todayStart = startOfTodayKarachi().getTime();
  // Spec §3: drafts are not route metrics — exclude until submitted.
  const todayOrders = orders.filter(
    (o) =>
      o.status !== "draft" &&
      new Date(o.createdAt).getTime() >= todayStart,
  );
  // Spec E §9 (Figmi seq444, merged via #17): the hero money comes from the
  // ONE formula set in lib/money.ts — no local reduce here either. Behavior
  // is identical (todayOrders already excludes drafts; collectedSum is the
  // same min(subtotal, amountPaid) this page invented), now gate-26 clean.
  const todayBooked = bookedSum(todayOrders);
  // Privy coherence item (seq85): advance is real cash in the booker's
  // pocket — invoice.amountPaid is seeded from order.advance at invoicing, so
  // a prepaid stop counts as collected the moment the advance exists.
  const collectedAmt = collectedSum(todayOrders);
  const pct =
    todayBooked > 0
      ? Math.min(100, Math.floor((collectedAmt / todayBooked) * 100))
      : 0;
  const first = name?.split(" ")[0] ?? "Booker";
  const openStops = orders.filter((o) => {
    if (o.status === "draft") return false;
    if (CLOSED.includes(o.status)) return false;
    if (o.invoice?.paymentStatus === "paid") return false;
    if (o.invoice != null && (o.invoice.balance ?? 1) <= 0) return false;
    return true;
  });
  const nextStops = openStops.slice(0, 5);
  const stopsLeft = openStops.length;
  const toCollect = openStops.filter((o) => (o.invoice?.balance ?? 0) > 0).length;
  // Spec E §5 (routeLine): name a route ONLY when every counted stop belongs
  // to it — the old chips paired one found route with an all-stops count, a
  // fabricated pair on any multi-route day (Bilal spans Routes 1 and 5). One
  // helper feeds both chips: form A counts today's booked SHOPS, the carry-over
  // chip counts OPEN stops. 'open' is never droppable (10px mono: 'stops' is
  // one letter from 'shops' and they mean opposite things); plural is real.
  const routeLine = (
    count: number,
    routeNos: (string | null)[],
    unit: "stop" | "shop",
    open = false,
  ): string => {
    const uniq = [...new Set(routeNos.filter((r): r is string => !!r))];
    const n = `${count} ${count === 1 ? unit : `${unit}s`}${open ? " open" : ""}`;
    if (uniq.length === 1) return `Route ${uniq[0]} · ${n}`;
    if (uniq.length === 0) return n;
    return `${n} · ${uniq.length} routes`;
  };
  // G3/G4: hero form picks per day; the chip is honest via routeLine.
  const routeLabel = routeLine(
    todayOrders.length,
    todayOrders.map((o) => o.customer.route),
    "shop",
  );
  const hasRouteToday = todayOrders.length > 0;
  // Privy seq384 fix: the ghost promises a hero on every day, so the READY
  // state must keep the frame mounted too — the predicate picks the FORM,
  // never deletes the frame.
  const openRouteLabel =
    stopsLeft === 0
      ? "No stops open today"
      : routeLine(
          stopsLeft,
          openStops.map((o) => o.customer.route),
          "stop",
          true,
        );

  // Spec E §2 (owner REMOVE confirmed @474): stopState's pill half is DELETED
  // — this page no longer derives its own vocabulary. The pill is orderLabel,
  // same as the orders tab, so both surfaces match for the same session. The
  // dot half stays, derived FROM the tone (§9(2) table): .pstop-n has exactly
  // three board variants — ok (money in), warm (someone must act), neutral
  // (nothing to act on yet). The 5-tone pill vocabulary never leaks into dots.
  const dotClass = (tone: string): string =>
    tone === "ok" ? "ok" : tone === "warn" ? "warm" : "";

  return (
    <BookerChrome title={`Salaam, ${first}`}>
      {error && <p className="muted">{error}</p>}
      {phase === "loading" && (
        // §2b: the hero FRAME and its label are chrome — real at t=0. Only
        // the amount ghosts; §2c rule 3 keeps the track grey-filled.
        <div className="phero" aria-busy="true">
          <span className="sr-only">Loading today's route…</span>
          <div className="rowb">
            <p className="phero-lab">Collected today</p>
            <span className="phero-route">
              <GLine s={GS.word} />
            </span>
          </div>
          <p className="phero-val num g g-num g-breathe" aria-hidden="true">
            {GS.money7}
          </p>
          {/* §2c rule 3: an empty track reads "0 % collected" — a value. The
              real track renders with a constant grey 58% fill instead. */}
          <div className="phero-bar">
            <span className="g-fill" />
          </div>
        </div>
      )}
      {phase === "ready" && hasRouteToday && (
        <div className="phero">
          <div className="rowb">
            <p className="phero-lab">Collected today</p>
            <span className="phero-route">{routeLabel}</span>
          </div>
          {/* Figmi seq395 adjust 3: the 'cash received today · incl. earlier
              invoices' meta dropped — collectedAmt only sums today-created
              orders (no paidAt in schema), so it asserted an unverifiable
              scope. Restore when paidAt lands. */}
          {collectedAmt === 0 ? (
            // no ink zero (§8b gate 16); copy split by provability
            <p className="phero-val is-quiet">
              {todayBooked > 0 ? "Nothing collected yet" : "No bookings today"}
            </p>
          ) : (
            <p className="phero-val num"><CountUp value={collectedAmt} money /></p>
          )}
          <div className="phero-bar"><span style={{ width: `${pct}%` }}></span></div>
          {todayBooked > 0 && (
            <div className="rowb" style={{ marginTop: 8 }}>
              <span className="phero-meta">{pct}% of <Money value={todayBooked} /> booked</span>
              <span className="phero-meta"><Money value={Math.max(0, todayBooked - collectedAmt)} /> to go</span>
            </div>
          )}
        </div>
      )}
      {phase === "ready" && !hasRouteToday && (
        // §2c rule 5 (Figmi-blessed): frame stays mounted — the predicate picks
        // the FORM, never deletes it. Quiet 22px copy, never an ink zero, never
        // a grey preview (§8b gates 13/16). Carry-over day keeps the real track
        // EMPTY (a true 0% is an empty track); off day drops the bar row —
        // nothing to measure.
        <div className="phero">
          <div className="rowb">
            <p className="phero-lab">Collected today</p>
            <span className="phero-route">{openRouteLabel}</span>
          </div>
          <p className="phero-val is-quiet">No bookings today</p>
          {stopsLeft > 0 && <div className="phero-bar" />}
        </div>
      )}

      {phase === "loading" ? (
        <div className="pstats">
          <SkelTiles labels={["Booked today", "Stops left", "Bills open"]} />
        </div>
      ) : (
      <div className="pstats">
        <div className="pstat"><p className="pstat-lab">Booked today</p><p className="pstat-val num"><CountUp value={todayOrders.length} /></p></div>
        <div className="pstat"><p className="pstat-lab">Stops left</p><p className="pstat-val num"><CountUp value={stopsLeft} /></p></div>
        <div className="pstat"><p className="pstat-lab">Bills open</p><p className="pstat-val num"><CountUp value={toCollect} /></p></div>
      </div>
      )}

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
        {phase === "loading" &&
          Array.from({ length: 3 }, (_, i) => (
            <div className="pstop" key={i}>
              <span className="pstop-n num g g-num" aria-hidden="true">
                88
              </span>
              <span className="grow">
                <GPerson />
              </span>
              <GPill tone="ok" />
            </div>
          ))}
        {phase === "ready" && nextStops.length === 0 && (
          <p className="tbl-empty">
            {hasRouteToday ? "Every stop is collected." : "No route assigned for today."}
          </p>
        )}
        {nextStops.map((o, i) => {
          const ui = orderLabel(o);
          return (
            <div className="pstop" key={o.id}>
              <span className={`pstop-n ${dotClass(ui.tone)}`}>{i + 1}</span>
              <span className="grow">
                <Link href="/booker/orders" className="pname">{o.customer.name}</Link>
                <br />
                <span className="pmeta">
                  {o.customer.area ??
                    (o.customer.route ? `Route ${o.customer.route}` : "")}
                </span>
              </span>
              <StatusPill label={ui.label} tone={ui.tone} />
            </div>
          );
        })}
      </div>
    </BookerChrome>
  );
}
