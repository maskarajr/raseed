"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { StatusPill } from "@/components/badges";
import { OrderDocument } from "@/components/OrderDocument";
import { KpiCard } from "@/components/KpiCard";
import { ORDER_STATUSES } from "@/lib/enums";
import {
  startOfTodayKarachi,
  endOfTodayKarachi,
  isInTodayKarachi,
} from "@/lib/day";
import { Input } from "@/components/ui/input";

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
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <OrdersPageInner />
    </Suspense>
  );
}

function OrdersPageInner() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [todayOnly, setTodayOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

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

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearch(q);
  }, [searchParams]);

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

  const kpis = useMemo(() => {
    const submitted = orders.filter((o) => o.status === "submitted");
    const confirmed = orders.filter((o) => o.status === "confirmed");
    const billed = orders.filter((o) =>
      ["invoiced", "out_for_delivery", "delivered", "settled"].includes(o.status),
    );
    const today = orders.filter((o) => isInTodayKarachi(o.createdAt));
    const todayRs = today.reduce((s, o) => s + o.subtotal, 0);
    return {
      submitted: submitted.length,
      confirmed: confirmed.length,
      billed: billed.length,
      today: today.length,
      todayRs,
    };
  }, [orders]);

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
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-3xl font-semibold">Orders</h1>
        <p className="mt-0.5 text-sm text-muted">
          Booker orders · row opens the order document
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Submitted" hint="Awaiting confirm">
          <span className="tnum">{kpis.submitted}</span>
        </KpiCard>
        <KpiCard label="Confirmed" hint="Ready to invoice">
          <span className="tnum">{kpis.confirmed}</span>
        </KpiCard>
        <KpiCard label="Billed" hint="Invoiced or later">
          <span className="tnum">{kpis.billed}</span>
        </KpiCard>
        <KpiCard label="Today" hint={`${kpis.today} orders`}>
          <Money value={kpis.todayRs} />
        </KpiCard>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="max-w-sm"
            placeholder="Search Orders…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input max-w-[10rem]"
            aria-label="Filter"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUS_CHIPS.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "Filter: All" : s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setTodayOnly((v) => !v)}
            className={`btn h-9 px-3 text-sm ${
              todayOnly
                ? "bg-primary text-white hover:bg-primary-hover"
                : "border border-line bg-surface text-ink hover:bg-canvas"
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
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
                  active
                    ? "bg-primary text-white"
                    : "border border-line bg-surface text-muted hover:text-ink"
                }`}
              >
                {s === "all" ? "All" : s.replace(/_/g, " ")}
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="overflow-x-auto border border-line bg-surface">
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
                      ? "cursor-pointer bg-primary-soft/60"
                      : "cursor-pointer hover:bg-canvas"
                  }
                  onClick={() => setOpenId(o.id)}
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
                  <td className="tnum text-right font-mono">{o._count.items}</td>
                  <td className="text-right font-mono">
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
                        onClick={(e) => {
                          e.stopPropagation();
                          confirm(o.id);
                        }}
                      >
                        Confirm
                      </button>
                    )}
                    <button
                      type="button"
                      className="text-sm text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenId(o.id);
                      }}
                    >
                      Open
                    </button>
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

      {openId && (
        <OrderDocument
          orderId={openId}
          onClose={() => {
            setOpenId(null);
            load();
          }}
        />
      )}
    </div>
  );
}
