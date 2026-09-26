"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { OfficeChrome } from "@/components/OfficeChrome";
import { StatusPill } from "@/components/badges";
import { useToast } from "@/components/Toast";

type Me = { name: string; email: string; role: string } | null;
type Settings = {
  businessName: string;
  officeHours: string;
  bookersSeeOutstanding: boolean;
  offlineCapture: boolean;
};

export default function SettingsPage() {
  const toast = useToast();
  const [me, setMe] = useState<Me>(null);
  const [dark, setDark] = useState(false);
  const [s, setS] = useState<Settings>({
    businessName: "Raseed Traders",
    officeHours: "09:00 – 19:00",
    bookersSeeOutstanding: true,
    offlineCapture: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ user: Me }>("/api/auth/me").then((d) => setMe(d.user));
    api<Settings>("/api/settings").then(setS).catch(() => undefined);
    setDark(document.documentElement.getAttribute("data-theme") === "dark");
  }, []);

  async function save() {
    setSaving(true);
    try {
      const next = await api<Settings>("/api/settings", {
        method: "PATCH",
        body: JSON.stringify(s),
      });
      setS(next);
      toast("Settings saved");
    } finally {
      setSaving(false);
    }
  }

  return (
    <OfficeChrome
      title="Settings"
      subtitle="Business, roles and appearance"
      actions={
        <button className="btn-primary" disabled={saving} onClick={save}>
          {saving ? "Saving…" : "Save"}
        </button>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card2">
          <div className="card2-h">
            <h2 className="h3s">Business</h2>
          </div>
          <div className="stack">
            <div className="lfield">
              <label>Business name</label>
              <input
                className="linput"
                value={s.businessName}
                onChange={(e) => setS({ ...s, businessName: e.target.value })}
              />
            </div>
            <div className="row" style={{ alignItems: "flex-start" }}>
              <div className="lfield grow">
                <label>Currency</label>
                <input className="linput" defaultValue="PKR · Rs" readOnly />
              </div>
              <div className="lfield grow">
                <label>Timezone</label>
                <input className="linput" defaultValue="Asia/Karachi" readOnly />
              </div>
            </div>
            <div className="lfield">
              <label>Office hours</label>
              <input
                className="linput"
                value={s.officeHours}
                onChange={(e) => setS({ ...s, officeHours: e.target.value })}
              />
            </div>
          </div>
        </div>
        <div className="card2">
          <div className="card2-h">
            <h2 className="h3s">Roles</h2>
          </div>
          <div className="prow" style={{ borderBottom: 0 }}>
            <span>
              <span className="pname">Bookers can see outstanding</span>
              <br />
              <span className="pmeta">Shows shop balances on capture</span>
            </span>
            <button
              type="button"
              className={`switch${s.bookersSeeOutstanding ? " is-on" : ""}`}
              role="switch"
              aria-checked={s.bookersSeeOutstanding}
              onClick={() =>
                setS({ ...s, bookersSeeOutstanding: !s.bookersSeeOutstanding })
              }
            />
          </div>
          <div className="prow" style={{ borderBottom: 0 }}>
            <span>
              <span className="pname">Allow offline capture</span>
              <br />
              <span className="pmeta">Queues orders until the phone reconnects</span>
            </span>
            <button
              type="button"
              className={`switch${s.offlineCapture ? " is-on" : ""}`}
              role="switch"
              aria-checked={s.offlineCapture}
              onClick={() => setS({ ...s, offlineCapture: !s.offlineCapture })}
            />
          </div>
        </div>
        <div className="card2">
          <div className="card2-h">
            <h2 className="h3s">Session</h2>
          </div>
          <div className="prow" style={{ borderBottom: 0 }}>
            <span>
              <span className="pname">{me?.name ?? "…"}</span>
              <br />
              <span className="pmeta">
                {me?.role ?? "…"} · {me?.email ?? ""}
              </span>
            </span>
            <StatusPill status="active" />
          </div>
        </div>
        <div className="card2">
          <div className="card2-h">
            <h2 className="h3s">Appearance</h2>
            <StatusPill status="not shipped" />
          </div>
          <div className="prow" style={{ borderBottom: 0 }}>
            <span>
              <span className="pname">Dark office chrome</span>
              <br />
              <span className="pmeta">Held until VISUAL.md ships a dark canvas.</span>
            </span>
            <button
              type="button"
              className={`switch${dark ? " is-on" : ""}`}
              role="switch"
              aria-checked={dark}
              onClick={() => {
                const next = !dark;
                setDark(next);
                document.documentElement.setAttribute(
                  "data-theme",
                  next ? "dark" : "light",
                );
              }}
            />
          </div>
        </div>
      </div>
    </OfficeChrome>
  );
}
