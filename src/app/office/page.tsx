"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Money } from "@/components/Money";
import { CountUp } from "@/components/CountUp";
import { OfficeChrome } from "@/components/OfficeChrome";
import { Icon } from "@/components/Icon";
import { formatTodayKarachi } from "@/lib/day";
import { useToast } from "@/components/Toast";
import {
  GSpark,
  SkelPipeline,
  SkelStatLines,
  GPerson,
  GBtn,
  GS,
} from "@/components/skeletons";

type SeriesPoint = {
  label: string; // short weekday, e.g. "Wed"
  booked?: number;
  collected?: number;
  due?: number;
};

type HomeResponse = {
  kpis: {
    bookedToday: number;
    bookedYesterday: number;
    ordersToday: number;
    outstanding: number;
    outstandingCount: number;
    collectedToday: number;
    awaitingConfirm: number;
    oldestAwaitingMins: number;
    lowStock: number;
    outOfStock: number;
    bookersToday?: number;
  };
  submitted: {
    id: string;
    code: string;
    status: string;
    createdAt: string;
    booker: string;
    customer: string;
    subtotal: number;
    items: number;
  }[];
  outstandingInvoices: { id: string; code: string; customer: string; balance: number }[];
  // Breevie contract: lifecycle pipeline as per-status counts.
  pipeline?: { status: string; count: number }[];
  series?: SeriesPoint[];
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function minsAgo(iso: string): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.round((Date.now() - t) / 60000));
}
function relAge(mins: number): string {
  if (mins < 1) return "now";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`;
}

/** Normalize a set of values into 0..100 heights, tagging the last as "now". */
function bars(values: number[]): { pct: number; now: boolean }[] {
  const max = Math.max(1, ...values);
  return values.map((v, i) => ({
    pct: Math.max(3, Math.round((v / max) * 100)),
    now: i === values.length - 1,
  }));
}

export default function OfficeDashboard() {
  const toast = useToast();
  const [data, setData] = useState<HomeResponse | null>(null);
  const [series, setSeries] = useState<SeriesPoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [today, setToday] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api<HomeResponse>("/api/office/home");
      setData(res);
      if (res.series?.length) setSeries(res.series);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    setToday(formatTodayKarachi());
    load();
    // 7-day Karachi-day series lives on the reports contract (?range=7d);
    // Breevie ships it only for that range. Map {day,booked,collected} to the
    // spark/chart shape (due = booked - collected).
    api<{ series?: { day: string; booked: number; collected: number }[] }>(
      "/api/reports?range=7d",
    )
      .then((r) => {
        if (r.series?.length)
          setSeries(
            r.series.map((p) => ({
              label: p.day,
              booked: p.booked,
              collected: p.collected,
              due: Math.max(0, p.booked - p.collected),
            })),
          );
      })
      .catch(() => {});
  }, [load]);

  if (error && !data) {
    return (
      <OfficeChrome title="Dashboard">
        <p className="muted">{error}</p>
      </OfficeChrome>
    );
  }
  if (!data) {
    // Spec D rev 2 §2b: every label/frame on this screen is chrome — real at
    // t=0. Only fetched numbers ghost, in their role silhouette.
    return (
      <OfficeChrome title="Dashboard">
        <span className="sr-only">Loading dashboard…</span>
        <div className="dash">
          <div className="dash-main">
            <div className="card2">
              <p className="klab">Booked today</p>
              <p className="kpi-val-lg num g g-num g-breathe" style={{ marginTop: 6 }} aria-hidden="true">
                Rs {GS.money7}
              </p>
              <GSpark />
              <div className="spark-lab" aria-hidden="true">
                {DAY_SHORT.map((l, i) => (
                  <span key={i} className={i === 6 ? "is-now" : undefined}>
                    {l}
                  </span>
                ))}
              </div>
              <SkelPipeline />
            </div>
            <div className="card2 is-fill">
              <p className="ptitle-s">Collected vs to collect</p>
              <p className="meta" style={{ marginTop: 4 }}>Last 7 days</p>
              <div className="g-band" style={{ marginTop: 10 }}>
                <SkelStatLines labels={["Collected", "To collect"]} />
              </div>
            </div>
          </div>
          <aside className="dash-rail">
            <div className="card2">
              <p className="ptitle-s">Today&apos;s position</p>
              <div className="g-band" style={{ marginTop: 6 }}>
                <SkelStatLines labels={["Outstanding", "Invoices open", "Low stock SKUs"]} />
              </div>
            </div>
            <div className="card2">
              <p className="ptitle-s">On the road</p>
              <div className="g-band" style={{ marginTop: 6 }}>
                <SkelStatLines labels={["Booked", "Collected", "To collect"]} />
              </div>
            </div>
            <div className="card2 is-fill">
              <p className="ptitle-s">Awaiting confirmation</p>
              <div className="stack g-band" style={{ gap: 10, marginTop: 8 }}>
                {[0, 1, 2].map((i) => (
                  <div className="rowb" key={i}>
                    <GPerson />
                    <GBtn label="888888" />
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </OfficeChrome>
    );
  }

  const { kpis } = data;
  const vsY = kpis.bookedToday - kpis.bookedYesterday;
  const vsYup = vsY >= 0;

  // Series for spark + chart: real contract data if present, else a flat
  // 7-bucket placeholder derived from today's totals (lights up when Breevie
  // ships reports.series / home.series).
  const s =
    series && series.length
      ? series
      : DAY_LABELS.map((_, i) => ({
          label: DAY_LABELS[(new Date().getDay() - (6 - i) + 7) % 7],
          booked: i === 6 ? kpis.bookedToday : 0,
          collected: i === 6 ? kpis.collectedToday : 0,
          due: 0,
        }));
  const labels = s.map((p, i) => p.label || DAY_SHORT[new Date().getDay()]);
  const sparkBars = bars(s.map((p) => p.booked ?? 0));
  const chartMax = Math.max(1, ...s.map((p) => (p.booked ?? (p.collected ?? 0) + (p.due ?? 0))));
  const chart = s.map((p) => {
    const booked = p.booked ?? (p.collected ?? 0) + (p.due ?? 0);
    const got = p.collected ?? 0;
    const due = p.due ?? Math.max(0, booked - got);
    const colH = Math.round((booked / chartMax) * 100);
    const gotPct = booked > 0 ? Math.round((got / booked) * 100) : 0;
    return { colH, gotPct, duePct: 100 - gotPct };
  });
  const bookedSum = s.reduce((a, p) => a + (p.booked ?? 0), 0);
  const collectedSum = s.reduce((a, p) => a + (p.collected ?? 0), 0);
  const collectedPct = bookedSum > 0 ? ((collectedSum / bookedSum) * 100).toFixed(1) : "0.0";

  // Pipeline: Breevie ships per-status counts on home.pipeline. Map to the
  // board's four lifecycle stages; awaiting-confirm is the "now" step. Falls
  // back to the awaiting KPI if the array is absent.
  const pcount = (st: string) =>
    data.pipeline?.find((p) => p.status === st)?.count ?? 0;
  const pipeSteps: { lab: string; n: number; now?: boolean }[] = [
    // §4 freeze: Scheduled means confirmed | out_for_delivery — the draft
    // stage keeps its own name in the pipeline.
    { lab: "Draft", n: pcount("draft") },
    {
      lab: "Awaiting confirm",
      n: data.pipeline ? pcount("submitted") : kpis.awaitingConfirm,
      now: true,
    },
    { lab: "Confirmed", n: pcount("confirmed") },
    { lab: "Invoiced", n: pcount("invoiced") },
  ];

  const onRoadBooked = kpis.bookedToday;
  const onRoadCollected = kpis.collectedToday;
  const onRoadPct = onRoadBooked > 0 ? Math.round((onRoadCollected / onRoadBooked) * 100) : 0;
  const bookersToday =
    (kpis as { bookersToday?: number }).bookersToday ??
    new Set(data.submitted.map((o) => o.booker)).size;

  const awaiting = data.submitted
    .slice()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(0, 5);

  // G8 (qa-v3-design-fidelity-final), Privy ruling seq-48 item 3: Export is
  // client-side CSV over exactly what the dashboard payload already holds —
  // the rendered 7-day series. No new backend; Range/30d stay out of scope.
  function exportCsv() {
    const rows = [
      ["Day", "Booked", "Collected", "Due"],
      ...s.map((p) => [
        p.label ?? "",
        String(p.booked ?? 0),
        String(p.collected ?? 0),
        String(p.due ?? 0),
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `raseed-dashboard-${today || "7d"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast("Dashboard exported · 7-day series");
  }

  return (
    <OfficeChrome
      title="Dashboard"
      subtitle={`${today || "…"} · office hours 09:00–19:00`}
      actions={
        <>
          <div className="seg" role="group" aria-label="Date range">
            <button type="button" className="seg-item is-on" disabled title="Current range">7 days</button>
            <button type="button" className="seg-item" disabled title="30-day range lands with the reports backend">30 days</button>
          </div>
          <button type="button" className="btn-sec" onClick={exportCsv}>
            Export
          </button>
          <Link href="/office/orders/new" className="btn-primary">
            <Icon name="plus" className="ic ic-sm" />
            New order
          </Link>
        </>
      }
      trailing={
        <span className="live">
          <i></i>Live
        </span>
      }
    >
      {error && <p className="muted">{error}</p>}
      <div className="dash">
        <div className="dash-main">
          {/* Hero: booked today + 7-day spark + lifecycle pipeline */}
          <div className="card2">
            <div className="rowb" style={{ alignItems: "flex-start" }}>
              <div>
                <p className="klab">Booked today</p>
                <p className="kpi-val-lg num" style={{ marginTop: 6 }}>
                  <CountUp value={kpis.bookedToday} money />
                </p>
                {/* R3 (Figmi seq253): name the EVENT — demand side vs cash side,
                    so Booked Rs 0 next to cash-in never reads self-contradictory. */}
                <p className="meta" style={{ marginTop: 4 }}>
                  orders raised today
                </p>
                <p className="delta" style={{ marginTop: 9 }}>
                  <span className={`caret${vsYup ? "" : " down"}`}></span>
                  {vsYup ? "+" : "−"}
                  <Money value={Math.abs(vsY)} /> vs yesterday · {kpis.ordersToday} placed
                </p>
              </div>
              <p className="meta">7-day trend</p>
            </div>
            <div className="spark" style={{ marginTop: 13 }}>
              {sparkBars.map((b, i) => (
                <i key={i} className={b.now ? "is-now" : undefined} style={{ height: `${b.pct}%`, ["--i" as string]: i }} />
              ))}
            </div>
            <div className="spark-lab">
              {labels.map((l, i) => (
                <span key={i} className={i === labels.length - 1 ? "is-now" : undefined}>{l}</span>
              ))}
            </div>
            <div className="kpi-split">
              <div className="rowb" style={{ marginBottom: 9 }}>
                <p className="ptitle-s">Today's flow</p>
                <p className="meta">{kpis.ordersToday} orders placed today</p>
              </div>
              <div className="pipe">
                {pipeSteps.map((st, i) => (
                  <div key={st.lab} style={{ display: "contents" }}>
                    {i > 0 && <span className="pipe-line" style={{ ["--i" as string]: i }} />}
                    <div className={`pipe-step${st.now ? " now" : ""}`}>
                      <span className="pipe-dot" style={{ ["--i" as string]: i }}></span>
                      <span className="pipe-lab">{st.lab}</span>
                      <span className="pipe-n">{st.n}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Collected vs to collect chart */}
          <div className="card2 is-fill">
            <div className="card2-h">
              <div>
                <h4 className="h3s">Collected vs to collect</h4>
                <p className="meta" style={{ marginTop: 2 }}>
                  Last 7 days · <Money value={collectedSum} /> of <Money value={bookedSum} /> booked
                </p>
              </div>
              <span className="num" style={{ fontSize: 14, fontWeight: 600 }}>{collectedPct}%</span>
            </div>
            <div className="chart">
              {chart.map((c, i) => (
                <div className="col" key={i}>
                  <div className="col-bar" style={{ height: `${c.colH}%`, ["--i" as string]: i }}>
                    <div className="col-due" style={{ height: `${c.duePct}%` }}></div>
                    <div className="col-got" style={{ height: `${c.gotPct}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="spark-lab">
              {labels.map((l, i) => (
                <span key={i} className={i === labels.length - 1 ? "is-now" : undefined}>{l}</span>
              ))}
            </div>
            <div className="legend2">
              <span><i style={{ background: "var(--fg)" }}></i>Collected</span>
              <span><i style={{ background: "var(--warm)" }}></i>To collect</span>
            </div>
          </div>
        </div>

        {/* Rail: position + on the road + needs attention */}
        <aside className="dash-rail">
          <div className="card2">
            <p className="ptitle-s">Today's position</p>
            <div className="stat-list" style={{ marginTop: 6 }}>
              <div className="stat-line"><span className="l">Outstanding</span><span className="v"><Money value={kpis.outstanding} /></span></div>
              <div className="stat-line"><span className="l">Invoices open</span><span className="v">{kpis.outstandingCount}</span></div>
              <div className="stat-line"><span className="l">Low stock SKUs</span><span className="v">{kpis.lowStock}</span></div>
            </div>
          </div>

          <div className="card2">
            <div className="rowb" style={{ marginBottom: 8 }}>
              <p className="ptitle-s">On the road</p>
              <p className="meta">{bookersToday} {bookersToday === 1 ? "booker" : "bookers"} · {onRoadPct}% collected</p>
            </div>
            <div className="stat-list">
              <div className="stat-line"><span className="l">Booked</span><span className="v"><Money value={onRoadBooked} /></span></div>
              <div className="stat-line"><span className="l">Collected</span><span className="v"><Money value={onRoadCollected} /></span></div>
              <div className="stat-line"><span className="l">To collect</span><span className="v"><Money value={Math.max(0, onRoadBooked - onRoadCollected)} /></span></div>
            </div>
            <div style={{ height: 6, background: "color-mix(in oklch,var(--warm) 22%,transparent)", borderRadius: 999, marginTop: 11, display: "flex", overflow: "hidden" }}>
              <span style={{ width: `${onRoadPct}%`, background: "var(--fg)", borderRadius: 999 }}></span>
            </div>
          </div>

          <div className="card2 is-fill">
            <div className="card2-h">
              <h4 className="h3s">Awaiting confirmation</h4>
              <span className="meta">{kpis.awaitingConfirm} orders</span>
            </div>
            {awaiting.length === 0 ? (
              <p className="tbl-empty">Queue clear — nothing waiting.</p>
            ) : (
              <div className="await-list">
                {awaiting.map((o) => (
                  <Link key={o.id} href={`/office/orders/${o.id}`} className="await-row">
                    <span className="sku">{o.code}</span>
                    <span className="who">{o.customer}</span>
                    <span className="pmeta">{o.booker}</span>
                    <span className="money"><Money value={o.subtotal} /></span>
                    <span className="pmeta">{relAge(minsAgo(o.createdAt))}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </OfficeChrome>
  );
}
