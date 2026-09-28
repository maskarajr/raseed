"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { CountUp } from "@/components/CountUp";
import { StatusPill } from "@/components/badges";
import { BookerChrome } from "@/components/BookerChrome";
import { startOfTodayKarachi } from "@/lib/day";
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
  const todayBooked = todayOrders.reduce((s, o) => s + o.subtotal, 0);
  // Privy coherence item (seq85): advance is real cash in the booker's
  // pocket. The hero reads the invoice-derived ledger — invoice.amountPaid is
  // seeded from order.advance at invoicing (deriveInvoiceState path), so a
  // prepaid stop counts as collected the moment the advance exists. Capped at
  // the order subtotal; scoped to today's bookings to match the denominator.
  const collectedAmt = todayOrders.reduce(
    (s, o) => s + Math.min(o.subtotal, o.invoice?.amountPaid ?? 0),
    0,
  );
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
  // G3/G4 (qa-v3-design-fidelity-final): the hero is route-conditional — a
  // zero-day must not render an ink hero claiming Rs 0 of Rs 0. Route chip is
  // the board's identity line `Route {n} · {N} shops`; pct floor-truncates.
  const routeNo =
    todayOrders.find((o) => o.customer.route)?.customer.route ?? null;
  const routeLabel = `Route ${routeNo ?? "—"} · ${todayOrders.length} shops`;
  const hasRouteToday = todayOrders.length > 0;
  // Privy seq384 fix: the ghost promises a hero on every day, so the READY
  // state must keep the frame mounted too. A created-today-zero day with open
  // stops is real work, not a blank: quiet `Rs 0` (a true value — no "% of
  // Rs 0 booked" claim) + the board line re-pointed at today's OPEN route.
  const openRouteNo =
    openStops.find((o) => o.customer.route)?.customer.route ?? null;
  const openRouteLabel =
    stopsLeft === 0
      ? "No stops open today"
      : openRouteNo
        ? `Route ${openRouteNo} · ${stopsLeft} ${stopsLeft === 1 ? "stop" : "stops"} open`
        : `${stopsLeft} ${stopsLeft === 1 ? "stop" : "stops"} open`;

  // Spec §4 freeze: "To collect" is an invoice fact (balance > 0), not a raw
  // status; confirmed/out_for_delivery without a balance read Scheduled.
  const stopState = (o: OrderRow): { n: string; pill: string } => {
    if (o.invoice?.paymentStatus === "paid" || (o.invoice != null && (o.invoice.balance ?? 1) <= 0))
      return { n: "ok", pill: "settled" };
    if ((o.invoice?.balance ?? 0) > 0) return { n: "warm", pill: "to collect" };
    return { n: "", pill: "scheduled" };
  };

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
          {/* R3 (Figmi seq253): cash-side scope — today's receipts can include
              collections on earlier invoices, so it needn't match booked. */}
          <p className="phero-meta" style={{ marginTop: 2 }}>
            cash received today · incl. earlier invoices
          </p>
          <p className="phero-val num"><CountUp value={collectedAmt} money /></p>
          <div className="phero-bar"><span style={{ width: `${pct}%` }}></span></div>
          <div className="rowb" style={{ marginTop: 8 }}>
            <span className="phero-meta">{pct}% of <Money value={todayBooked} /> booked</span>
            <span className="phero-meta"><Money value={Math.max(0, todayBooked - collectedAmt)} /> to go</span>
          </div>
        </div>
      )}
      {phase === "ready" && !hasRouteToday && (
        // Quiet real state (Privy seq384): frame stays mounted exactly as the
        // ghost promised. Rs 0 is the truth, not a ghost lie; no booked/%
        // claim; chip names the open route so the day still reads as work.
        <div className="phero">
          <div className="rowb">
            <p className="phero-lab">Collected today</p>
            <span className="phero-route">{openRouteLabel}</span>
          </div>
          <p className="phero-val num"><Money value={0} /></p>
          <div className="phero-bar">
            <span className="g-fill" />
          </div>
        </div>
      )}

      {phase === "loading" ? (
        <div className="pstats">
          <SkelTiles labels={["Orders", "Stops left", "To collect"]} />
        </div>
      ) : (
      <div className="pstats">
        <div className="pstat"><p className="pstat-lab">Orders</p><p className="pstat-val num"><CountUp value={todayOrders.length} /></p></div>
        <div className="pstat"><p className="pstat-lab">Stops left</p><p className="pstat-val num"><CountUp value={stopsLeft} /></p></div>
        <div className="pstat"><p className="pstat-lab">To collect</p><p className="pstat-val num"><CountUp value={toCollect} /></p></div>
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
