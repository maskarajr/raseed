"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { StatusPill } from "@/components/badges";
import { OfficeChrome } from "@/components/OfficeChrome";
import { startOfTodayKarachi, endOfTodayKarachi } from "@/lib/day";
import { statusUi } from "@/lib/status";
import { SideSheet } from "@/components/SideSheet";

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
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [term, setTerm] = useState("");
  const [search, setSearch] = useState("");
  const [booker, setBooker] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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
    const chip = new URLSearchParams(window.location.search).get("chip");
    if (chip === "awaiting") setTerm("awaiting");
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
      if (booker && o.booker.name !== booker) return false;
      if (q && !hay.includes(q)) return false;
      return true;
    });
  }, [orders, term, search, booker]);

  const placedToday = orders.filter((o) => {
    const t = new Date(o.createdAt).getTime();
    return t >= startOfTodayKarachi().getTime() && t < endOfTodayKarachi().getTime();
  }).length;

  return (
    <OfficeChrome
      title="Orders"
      subtitle={`${filtered.length} shown · ${placedToday} placed today`}
      actions={
        <>
          <button type="button" className="btn-sec" onClick={() => setFiltersOpen(true)}>
            Filters
          </button>
          <Link href="/office/orders/new" className="btn-primary">
            New order
          </Link>
        </>
      }
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
                <th />
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
                  <td>
                    <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
                      {o.status === "submitted" ? (
                        <button
                          type="button"
                          className="btn-sec btn-sm"
                          disabled={busyId === o.id}
                          onClick={async () => {
                            setBusyId(o.id);
                            try {
                              await api(`/api/orders/${o.id}/confirm`, {
                                method: "POST",
                              });
                              await load();
                            } catch (e) {
                              setError(
                                e instanceof Error ? e.message : "Confirm failed",
                              );
                            } finally {
                              setBusyId(null);
                            }
                          }}
                        >
                          Confirm
                        </button>
                      ) : null}
                      {o.status === "confirmed" ? (
                        <button
                          type="button"
                          className="btn-sec btn-sm"
                          disabled={busyId === o.id}
                          onClick={async () => {
                            setBusyId(o.id);
                            try {
                              const res = await api<{ invoice?: { id: string } }>(
                                `/api/orders/${o.id}/invoice`,
                                { method: "POST" },
                              );
                              if (res.invoice) {
                                router.push(`/office/invoices/${res.invoice.id}`);
                                return;
                              }
                              await load();
                            } catch (e) {
                              setError(
                                e instanceof Error ? e.message : "Invoice failed",
                              );
                            } finally {
                              setBusyId(null);
                            }
                          }}
                        >
                          Invoice
                        </button>
                      ) : null}
                      {o.invoice ? (
                        <Link
                          href={`/office/invoices/${o.invoice.id}`}
                          className="btn-ghost btn-sm"
                        >
                          Open invoice
                        </Link>
                      ) : (
                        <Link
                          href={`/office/orders/${o.id}`}
                          className="btn-ghost btn-sm"
                        >
                          Open
                        </Link>
                      )}
                    </div>
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
      {filtersOpen && (
        <SideSheet title="Filters" onClose={() => setFiltersOpen(false)}>
          <div className="stack">
            <div className="lfield">
              <label>Booker</label>
              <select
                className="linput"
                value={booker}
                onChange={(e) => setBooker(e.target.value)}
              >
                <option value="">All</option>
                {[...new Set(orders.map((o) => o.booker.name))].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setFiltersOpen(false)}
            >
              Apply
            </button>
          </div>
        </SideSheet>
      )}
    </OfficeChrome>
  );
}
