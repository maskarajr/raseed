"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { CountUp } from "@/components/CountUp";
import { StatusPill } from "@/components/badges";
import { BookerChrome } from "@/components/BookerChrome";
import { PaymentSheet } from "@/components/PaymentSheet";
import { orderLabel } from "@/lib/orderLabel";
import { bookedSum, collectedSum, toCollectSum } from "@/lib/money";
import { SkelCards, SkelTiles } from "@/components/skeletons";
import { startOfTodayKarachi, endOfTodayKarachi } from "@/lib/day";

type OrderRow = {
  id: string;
  code: string;
  status: string;
  subtotal: number;
  createdAt: string;
  customer: { name: string; area: string | null };
  invoice: {
    id: string;
    paymentStatus: string;
    balance: number;
    amountPaid?: number | null;
  } | null;
  _count: { items: number };
};

const CHIPS = [
  { label: "All", term: "" },
  { label: "Scheduled", term: "scheduled" },
  { label: "To collect", term: "to collect" },
  { label: "Collected", term: "collected" },
];

export default function BookerOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [term, setTerm] = useState("");
  const [collect, setCollect] = useState<OrderRow | null>(null);

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
  }, []);

  const todayCount = orders.filter((o) => {
    const t = new Date(o.createdAt).getTime();
    return (
      t >= startOfTodayKarachi().getTime() && t < endOfTodayKarachi().getTime()
    );
  }).length;

  // Money truth (Figmi seq444 / Privy seq447): the old residual formula
  // `booked - toCollect` counted drafts and unfilled invoices as collected.
  // Probe on demo DB: draft ORD-00009 (Rs 5,280) plus ~Rs 35k of not-yet-
  // invoiced open bookings inflated Collected by Rs 40,410. A draft is work,
  // never a rupee — all three sums now exclude draft/cancelled, and
  // Collected is real cash on invoices, capped per order at its subtotal.
  const booked = bookedSum(orders);
  const toCollect = toCollectSum(orders);
  const collected = collectedSum(orders);
  const collectedPct =
    booked > 0 ? Math.min(100, Math.round((collected / booked) * 100)) : 0;

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const ui = orderLabel(o);
      const hay = `${o.code} ${o.customer.name} ${ui.label}`.toLowerCase();
      if (term && !hay.includes(term)) return false;
      return true;
    });
  }, [orders, term]);

  return (
    <BookerChrome title="My orders" backHref="/booker" meta={`${todayCount} today`}>
      {phase === "loading" ? (
        <div className="pstats money">
          {/* §2c: loaded strip ends in .pstats-bar — ghost it, or the strip
              grows on swap (Figmi rule 3). */}
          <SkelTiles bar />
        </div>
      ) : (
      <div className="pstats money">
        <div className="pstat">
          <p className="pstat-lab">Booked</p>
          <p className="pstat-val num">
            <CountUp value={booked} money />
          </p>
        </div>
        <div className="pstat">
          <p className="pstat-lab">Collected</p>
          <p className="pstat-val num">
            <CountUp value={collected} money />
          </p>
        </div>
        <div className="pstat">
          <p className="pstat-lab">To collect</p>
          <p className="pstat-val num">
            <CountUp value={toCollect} money />
          </p>
        </div>
        <div className="pstats-bar" aria-hidden="true">
          <span style={{ width: `${collectedPct}%` }} />
        </div>
      </div>
      )}
      <div className="chips">
        {CHIPS.map((c) => (
          <button
            key={c.label}
            type="button"
            className={`chip${term === c.term ? " is-on" : ""}`}
            onClick={() => setTerm(c.term)}
          >
            {c.label}
          </button>
        ))}
      </div>
      {error && <p className="muted">{error}</p>}
      <div
        className={phase === "loading" ? "stack g-band" : "stack"}
        style={{ gap: 10 }}
        aria-busy={phase === "loading" || undefined}
      >
        {phase === "loading" && (
          <>
            <span className="sr-only">Loading orders…</span>
            <SkelCards />
          </>
        )}
        {phase === "ready" &&
          filtered.map((o) => {
          const ui = orderLabel(o);
          const canCollect = Boolean(o.invoice && o.invoice.balance > 0);
          return (
            <div key={o.id} className="pcard" data-row>
              <div className="rowb">
                <span>
                  <span className="pname">{o.customer.name}</span>
                  <br />
                  <span className="pmeta num">
                    {o.code} · {o._count.items} items
                    {canCollect && o.invoice
                      ? ` · Rs ${o.invoice.balance.toLocaleString("en-PK")} left`
                      : ""}
                  </span>
                </span>
                <StatusPill label={ui.label} tone={ui.tone} />
              </div>
              <div className="rowb" style={{ marginTop: 10 }}>
                <span className="num" style={{ fontSize: 15 }}>
                  <Money value={o.subtotal} />
                </span>
                {canCollect ? (
                  <button
                    type="button"
                    className="btn-sec btn-sm"
                    onClick={() => setCollect(o)}
                  >
                    Collect
                  </button>
                ) : (
                  <Link href={`/booker/orders/${o.id}`} className="btn-sec btn-sm">
                    Open
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {phase === "ready" && filtered.length === 0 && (
        <p className="tbl-empty">No orders match this filter.</p>
      )}
      {collect?.invoice && (
        <PaymentSheet
          invoiceId={collect.invoice.id}
          invoiceCode={collect.code}
          balance={collect.invoice.balance}
          onClose={() => setCollect(null)}
          onDone={() => {
            setCollect(null);
            api<{ orders: OrderRow[] }>("/api/orders")
              .then((d) => setOrders(d.orders))
              .catch(() => undefined);
          }}
        />
      )}
    </BookerChrome>
  );
}
