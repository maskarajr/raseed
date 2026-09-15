"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { StatusPill } from "@/components/badges";
import { BookerChrome } from "@/components/BookerChrome";
import { statusUi } from "@/lib/status";
import { startOfTodayKarachi, endOfTodayKarachi } from "@/lib/day";

type OrderRow = {
  id: string;
  code: string;
  status: string;
  subtotal: number;
  createdAt: string;
  customer: { name: string; area: string | null };
  invoice: { paymentStatus: string } | null;
  _count: { items: number };
};

const CHIPS = [
  { label: "All", term: "" },
  { label: "Scheduled", term: "scheduled" },
  { label: "To collect", term: "to collect" },
  { label: "Collected", term: "collected" },
];

function bookerOrderLabel(o: OrderRow): { label: string; status: string } {
  if (o.status === "settled" || o.invoice?.paymentStatus === "paid") {
    return { label: "Collected", status: "settled" };
  }
  if (
    o.invoice &&
    (o.invoice.paymentStatus === "unpaid" ||
      o.invoice.paymentStatus === "partial")
  ) {
    return { label: "To collect", status: "unpaid" };
  }
  if (o.status === "confirmed" || o.status === "invoiced") {
    return { label: "Scheduled", status: "scheduled" };
  }
  return { label: statusUi(o.status).label, status: o.status };
}

export default function BookerOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [term, setTerm] = useState("");

  useEffect(() => {
    api<{ orders: OrderRow[] }>("/api/orders")
      .then((d) => setOrders(d.orders))
      .catch((e) => setError(e.message));
  }, []);

  const todayCount = orders.filter((o) => {
    const t = new Date(o.createdAt).getTime();
    return (
      t >= startOfTodayKarachi().getTime() && t < endOfTodayKarachi().getTime()
    );
  }).length;

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const ui = bookerOrderLabel(o);
      const hay = `${o.code} ${o.customer.name} ${ui.label}`.toLowerCase();
      if (term && !hay.includes(term)) return false;
      return true;
    });
  }, [orders, term]);

  return (
    <BookerChrome title="My orders" backHref="/booker" meta={`${todayCount} today`}>
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
      <div className="stack" style={{ gap: 10 }}>
        {filtered.map((o) => {
          const ui = bookerOrderLabel(o);
          const collect = ui.label === "To collect";
          return (
            <div key={o.id} className="pcard" data-row>
              <div className="rowb">
                <span>
                  <span className="pname">{o.customer.name}</span>
                  <br />
                  <span className="pmeta num">
                    {o.code} · {o._count.items} items
                  </span>
                </span>
                <StatusPill status={ui.status} label={ui.label} />
              </div>
              <div className="rowb" style={{ marginTop: 10 }}>
                <span className="num" style={{ fontSize: 15 }}>
                  <Money value={o.subtotal} />
                </span>
                {collect ? (
                  <span className="btn-sec btn-sm">Collect</span>
                ) : (
                  <Link href="/booker/orders" className="btn-sec btn-sm">
                    Open
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <p className="tbl-empty">No orders match this filter.</p>
      )}
    </BookerChrome>
  );
}
