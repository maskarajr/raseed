"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { StatusPill } from "@/components/badges";
import { statusUi } from "@/lib/status";

type OrderRow = {
  id: string;
  code: string;
  status: string;
  subtotal: number;
  createdAt: string;
  customer: { name: string; area: string | null };
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
  const [error, setError] = useState<string | null>(null);
  const [term, setTerm] = useState("");

  useEffect(() => {
    api<{ orders: OrderRow[] }>("/api/orders")
      .then((d) => setOrders(d.orders))
      .catch((e) => setError(e.message));
  }, []);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const hay = `${o.code} ${o.customer.name} ${statusUi(o.status).label}`.toLowerCase();
      if (term && !hay.includes(term)) return false;
      return true;
    });
  }, [orders, term]);

  return (
    <>
      <div className="pbar">
        <p className="pbar-t">My orders</p>
        <Link href="/booker/orders/new" className="btn-primary btn-sm">
          New
        </Link>
      </div>
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
      {filtered.map((o) => (
        <div key={o.id} className="pcard prow" data-row>
          <div>
            <p className="sku">{o.code}</p>
            <p className="pname">{o.customer.name}</p>
            <p className="meta">
              {o._count.items} items · <Money value={o.subtotal} />
            </p>
          </div>
          <StatusPill status={o.status} />
        </div>
      ))}
      {filtered.length === 0 && <p className="tbl-empty">No orders yet.</p>}
    </>
  );
}
