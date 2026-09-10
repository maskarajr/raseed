"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { StatusPill } from "@/components/badges";
import { ORDER_STATUSES } from "@/lib/enums";
import { startOfTodayKarachi, endOfTodayKarachi } from "@/lib/day";

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

const STATUS_CHIPS = ["all", ...ORDER_STATUSES] as const;

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [todayOnly, setTodayOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      const { orders } = await api<{ orders: OrderRow[] }>("/api/orders");
      setOrders(orders);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function confirm(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await api(`/api/orders/${id}/confirm`, { method: "POST" });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Confirm failed");
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const dayStart = todayOnly ? startOfTodayKarachi().getTime() : 0;
    const dayEnd = todayOnly ? endOfTodayKarachi().getTime() : 0;
    return orders.filter((o) => {
      if (status !== "all" && o.status !== status) return false;
      if (todayOnly) {
        const t = new Date(o.createdAt).getTime();
        if (t < dayStart || t >= dayEnd) return false;
      }
      if (q) {
        const hay = `${o.code} ${o.customer.name} ${o.booker.name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orders, status, search, todayOnly]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Orders</h1>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="input max-w-xs"
            placeholder="Search order#, customer, booker…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setTodayOnly((v) => !v)}
            className={`chip h-9 rounded px-3 text-sm ${
              todayOnly ? "chip-active" : ""
            }`}
            aria-pressed={todayOnly}
          >
            Today
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {STATUS_CHIPS.map((s) => {
            const active = status === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`chip capitalize ${active ? "chip-active" : ""}`}
              >
                {s === "all" ? "All" : s.replace(/_/g, " ")}
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Order#</th>
              <th>Booker</th>
              <th>Customer</th>
              <th className="text-right">Items</th>
              <th className="text-right">Total</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => {
              const isSubmitted = o.status === "submitted";
              return (
                <tr
                  key={o.id}
                  className={
                    isSubmitted
                      ? "border-l-2 border-l-primary bg-[#F7F7F7]"
                      : "odd:bg-[#FCFCFC]"
                  }
                >
                  <td className="whitespace-nowrap text-xs text-muted">
                    {new Date(o.createdAt).toLocaleString("en-GB", {
                      timeZone: "Asia/Karachi",
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="font-mono text-xs">{o.code}</td>
                  <td>{o.booker.name}</td>
                  <td>
                    {o.customer.name}
                    {o.customer.area ? (
                      <span className="text-xs text-muted">
                        {" "}
                        · {o.customer.area}
                      </span>
                    ) : null}
                  </td>
                  <td className="tnum text-right">{o._count.items}</td>
                  <td className="text-right">
                    <Money value={o.subtotal} />
                  </td>
                  <td>
                    <StatusPill status={o.status} />
                  </td>
                  <td className="whitespace-nowrap text-right">
                    {isSubmitted && (
                      <button
                        className="btn-primary mr-2 h-8 px-2 py-0 text-xs"
                        disabled={busyId === o.id}
                        onClick={() => confirm(o.id)}
                      >
                        Confirm
                      </button>
                    )}
                    <Link
                      href={`/office/orders/${o.id}`}
                      className="text-sm text-primary"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-muted">
                  No orders match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
