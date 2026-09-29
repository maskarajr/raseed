"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { LogoutButton } from "@/components/LogoutButton";
import { BookerChrome } from "@/components/BookerChrome";
import { Money } from "@/components/Money";
import { StatusPill } from "@/components/badges";
import { initials } from "@/lib/person";
import { startOfTodayKarachi } from "@/lib/day";
import { bookedSum, collectedSum } from "@/lib/money";
import { PwaInstallCta } from "@/components/PwaInstallCta";
import { GPerson, GNum, GS } from "@/components/skeletons";

type Me = { name: string; email: string; role: string } | null;

type OrderRow = {
  subtotal: number;
  status: string;
  createdAt: string;
  // G3 (Figmi seq512): the money shape the helpers need — /api/orders already
  // sends invoice.amountPaid (#17 select); declaring it here lets the Today
  // card consume lib/money.ts instead of bespoke math.
  invoice: { amountPaid?: number | null } | null;
};

export default function BookerAccountPage() {
  const [me, setMe] = useState<Me>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [phase, setPhase] = useState<"loading" | "ready">("loading");

  useEffect(() => {
    // §2c rule 4: no more —/…/0/Rs 0 while in flight — a real loading phase,
    // ghosts in the loaded silhouettes.
    Promise.all([
      api<{ user: Me }>("/api/auth/me").then((d) => setMe(d.user)),
      api<{ orders: OrderRow[] }>("/api/orders")
        .then((d) => setOrders(d.orders))
        .catch(() => setOrders([])),
    ])
      .catch(() => undefined)
      .finally(() => setPhase("ready"));
  }, []);

  const todayStart = startOfTodayKarachi().getTime();
  const today = orders.filter(
    (o) => new Date(o.createdAt).getTime() >= todayStart,
  );
  // G3 (Figmi seq512, tracked by Privy seq515): this card used three rules at
  // once — drafts counted as rupees, lifetime settled-subtotal cash over
  // today's booked volume, and a load-bearing min(100) clamp that pegged the
  // bar to 100% on most days. Now ONE population: both sides come from
  // lib/money.ts over today's orders. The count tile keeps drafts (a draft is
  // work), the money never does; collectedSum caps each row at its subtotal,
  // so collected <= booked by construction and the clamp below is a guard
  // that cannot fire (gate 30).
  const booked = bookedSum(today);
  const collected = collectedSum(today);
  const pct =
    booked > 0 ? Math.min(100, Math.round((collected / booked) * 100)) : 0;

  return (
    <BookerChrome title="Account">
      {phase === "loading" ? (
        <div className="pcard">
          <GPerson big />
        </div>
      ) : (
        me && (
          <div className="pcard">
            <div className="person">
              <span className="avatar" style={{ width: 40, height: 40, fontSize: 13 }}>
                {initials(me.name)}
              </span>
              <span>
                <span className="pname">{me.name}</span>
                <br />
                <span className="pmeta">
                  {me.role} · {me.email}
                </span>
              </span>
            </div>
          </div>
        )
      )}
      {phase === "loading" ? (
        // Same silhouettes as loaded: .pbig figure ghost, money ghosts, and
        // the real 6px track carrying a grey .g-fill (never 0-width).
        <div className="pcard" aria-busy="true">
          <span className="sr-only">Loading account…</span>
          <p className="ptitle-s">Today</p>
          <div
            className="rowb"
            style={{ marginTop: 8, alignItems: "flex-end" }}
          >
            <span className="pbig num g g-num g-breathe" aria-hidden="true">
              {GS.figure}
            </span>
            <span style={{ textAlign: "right" }}>
              <span className="num" style={{ display: "block", fontSize: 15 }}>
                <span className="muted">Rs&nbsp;</span>
                <GNum s={GS.money} />
              </span>
              <span className="pmeta">booked</span>
            </span>
          </div>
          <div
            aria-hidden="true"
            style={{
              height: 6,
              background: "var(--border)",
              borderRadius: 999,
              marginTop: 12,
              display: "flex",
              overflow: "hidden",
            }}
          >
            <span className="g-fill" />
          </div>
          <p className="pmeta" style={{ marginTop: 6 }}>
            <span className="muted">Rs&nbsp;</span>
            <GNum s={GS.money} /> collected
          </p>
        </div>
      ) : (
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
      )}
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
