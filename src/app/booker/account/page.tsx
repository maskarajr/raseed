"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { LogoutButton } from "@/components/LogoutButton";
import { BookerChrome } from "@/components/BookerChrome";
import { Money } from "@/components/Money";
import { StatusPill } from "@/components/badges";
import { initials } from "@/lib/person";
import { startOfTodayKarachi } from "@/lib/day";
import { PwaInstallCta } from "@/components/PwaInstallCta";

type Me = { name: string; email: string; role: string } | null;

type OrderRow = {
  subtotal: number;
  status: string;
  createdAt: string;
};

export default function BookerAccountPage() {
  const [me, setMe] = useState<Me>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);

  useEffect(() => {
    api<{ user: Me }>("/api/auth/me").then((d) => setMe(d.user));
    api<{ orders: OrderRow[] }>("/api/orders")
      .then((d) => setOrders(d.orders))
      .catch(() => setOrders([]));
  }, []);

  const todayStart = startOfTodayKarachi().getTime();
  const today = orders.filter(
    (o) => new Date(o.createdAt).getTime() >= todayStart,
  );
  const booked = today.reduce((s, o) => s + o.subtotal, 0);
  const collected = orders
    .filter((o) => o.status === "settled")
    .reduce((s, o) => s + o.subtotal, 0);
  const pct =
    booked > 0 ? Math.min(100, Math.round((collected / booked) * 100)) : 0;

  return (
    <BookerChrome title="Account">
      <div className="pcard">
        <div className="person">
          <span className="avatar" style={{ width: 40, height: 40, fontSize: 13 }}>
            {me ? initials(me.name) : "—"}
          </span>
          <span>
            <span className="pname">{me?.name ?? "…"}</span>
            <br />
            <span className="pmeta">
              {me?.role ?? "…"} · {me?.email ?? ""}
            </span>
          </span>
        </div>
      </div>
      <div className="pcard">
        <p className="ptitle-s">Today</p>
        <div
          className="rowb"
          style={{ marginTop: 8, alignItems: "flex-end" }}
        >
          <span className="pbig num">{today.length}</span>
          <span style={{ textAlign: "right" }}>
            <span className="num" style={{ display: "block", fontSize: 15 }}>
              <Money value={booked} />
            </span>
            <span className="pmeta">booked</span>
          </span>
        </div>
        <div
          style={{
            height: 6,
            background: "var(--border)",
            borderRadius: 999,
            marginTop: 12,
          }}
        >
          <div
            style={{
              height: 6,
              width: `${pct}%`,
              background: "var(--accent)",
              borderRadius: 999,
            }}
          />
        </div>
        <p className="pmeta" style={{ marginTop: 6 }}>
          <Money value={collected} /> collected
        </p>
      </div>
      <div className="pcard">
        <div className="prow">
          <span>
            <span className="pname">Sync</span>
            <br />
            <span className="pmeta">Online · this device</span>
          </span>
          <StatusPill status="on track" label="Up to date" />
        </div>
        <div className="prow">
          <span className="muted">Currency</span>
          <span>PKR</span>
        </div>
        <div className="prow">
          <span className="muted">Language</span>
          <span>English</span>
        </div>
      </div>
      <div className="pcard">
        <p className="ptitle-s" style={{ marginBottom: 8 }}>
          This phone
        </p>
        <PwaInstallCta compact />
      </div>
      <LogoutButton />
    </BookerChrome>
  );
}
