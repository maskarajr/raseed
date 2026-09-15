"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { OfficeChrome } from "@/components/OfficeChrome";
import { LogoutButton } from "@/components/LogoutButton";
import { StatusPill } from "@/components/badges";

type Me = { name: string; email: string; role: string } | null;

export default function SettingsPage() {
  const [me, setMe] = useState<Me>(null);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    api<{ user: Me }>("/api/auth/me").then((d) => setMe(d.user));
    setDark(document.documentElement.getAttribute("data-theme") === "dark");
  }, []);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute(
      "data-theme",
      next ? "dark" : "light",
    );
  }

  return (
    <OfficeChrome
      title="Settings"
      subtitle="Business, roles and appearance"
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card2">
          <div className="card2-h">
            <h2 className="h3s">Business</h2>
          </div>
          <div className="stack">
            <div className="lfield">
              <label>Business name</label>
              <input className="linput" defaultValue="Raseed Traders" readOnly />
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
              <input className="linput" defaultValue="09:00 – 19:00" readOnly />
            </div>
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
          <LogoutButton />
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
              <span className="pmeta">
                Opt-in token block. Print stays light.
              </span>
            </span>
            <button
              type="button"
              className={`switch${dark ? " is-on" : ""}`}
              role="switch"
              aria-checked={dark}
              onClick={toggleDark}
            />
          </div>
        </div>
      </div>
    </OfficeChrome>
  );
}
