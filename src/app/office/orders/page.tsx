"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { StatusPill } from "@/components/badges";
import { OfficeChrome } from "@/components/OfficeChrome";
import { startOfTodayKarachi, endOfTodayKarachi } from "@/lib/day";
import { statusUi } from "@/lib/status";

type OrderRow = {
  id: string;
  code: string;
  status: string;
  subtotal: number;
  createdAt: string;
  customer: { name: string; area: string | null };
  booker: { name: string };
  invoice: { id: string; code: string; paymentStatus: string } | null;
  _count: { items: number };
};

const CHIPS: { label: string; term: string }[] = [
  { label: "All", term: "" },
  { label: "Scheduled", term: "scheduled" },
  { label: "Confirmed", term: "confirmed" },
  { label: "Awaiting confirm", term: "awaiting" },
  { label: "Draft", term: "draft" },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [term, setTerm] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const { orders: rows } = await api<{ orders: OrderRow[] }>("/api/orders");
      setOrders(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      const extra =
        o.status === "invoiced" || o.status === "out_for_delivery"
          ? " scheduled"
          : "";
      const hay =
        `${o.code} ${o.customer.name} ${o.booker.name} ${o.status} ${statusUi(o.status).label}${extra}`.toLowerCase();
      if (term && !hay.includes(term)) return false;
      if (q && !hay.includes(q)) return false;
      return true;
    });
  }, [orders, term, search]);

  const placedToday = orders.filter((o) => {
    const t = new Date(o.createdAt).getTime();
    return t >= startOfTodayKarachi().getTime() && t < endOfTodayKarachi().getTime();
  }).length;

  return (
    <OfficeChrome
      title="Orders"
      subtitle={`${filtered.length} shown · ${placedToday} placed today`}
    >
      <div className="rowb">
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
        <input
          className="search"
          placeholder="Order, customer, booker"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {error && <p className="muted">{error}</p>}
      <div className="card2 grow">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Booker</th>
                <th>Route</th>
                <th className="r">Items</th>
                <th className="r">Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id}>
                  <td className="sku">
                    <Link href={`/office/orders/${o.id}`}>{o.code}</Link>
                  </td>
                  <td>{o.customer.name}</td>
                  <td>{o.booker.name}</td>
                  <td className="sku">{o.customer.area ?? "—"}</td>
                  <td className="r num">{o._count.items}</td>
                  <td className="money">
                    <Money value={o.subtotal} />
                  </td>
                  <td>
                    <StatusPill status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="tbl-empty">No orders match this filter.</p>
          )}
        </div>
      </div>
    </OfficeChrome>
  );
}
