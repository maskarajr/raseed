"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/client";
import type { Role } from "@/lib/enums";
import { PwaInstallCta } from "@/components/PwaInstallCta";
import { BrandMark } from "@/components/BrandMark";

type Desk = "office" | "booker";

const DESKS: { id: Desk; name: string; desc: string; hint: string }[] = [
  { id: "office", name: "Office", desc: "Dashboard, orders, invoices", hint: "Desktop app · full rail" },
  { id: "booker", name: "Booker", desc: "Route, capture, collections", hint: "Phone layout · route first" },
];

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Presentation only — which desk to advertise. Auth never reads this; the
  // server decides the landing route from user.role.
  const [desk, setDesk] = useState<Desk>("office");
  const groupRef = useRef<HTMLDivElement>(null);

  const active = DESKS.find((d) => d.id === desk)!;

  function onGroupKey(e: React.KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowDown" && e.key !== "ArrowLeft" && e.key !== "ArrowUp")
      return;
    e.preventDefault();
    const next = desk === "office" ? "booker" : "office";
    setDesk(next);
    const btns = groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    btns?.[next === "office" ? 0 : 1]?.focus();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { user } = await api<{ user: { role: Role } }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      window.location.assign(user.role === "booker" ? "/booker" : "/office");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <main className="login" style={{ minHeight: "100vh" }}>
        <div className="login-l">
          <div className="login-card">
            <div className="rlock">
              <span className="rmark">
                <BrandMark compact className="mk" />
              </span>
              <span className="rl-w">Raseed</span>
            </div>
            <div>
              <h1 className="login-h">
                {desk === "booker" ? "Sign in to the route" : "Sign in to the office"}
              </h1>
              <p className="muted" style={{ fontSize: 14, marginTop: 8 }}>
                Office hours 09:00–19:00 · Asia/Karachi
              </p>
            </div>
            <form onSubmit={onSubmit} className="stack" style={{ gap: 14 }}>
              <div className="lfield">
                <label htmlFor="email">Work email</label>
                <input
                  id="email"
                  type="email"
                  className="linput"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
              <div className="lfield">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  className="linput"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              {error && <p className="muted">{error}</p>}
              <button type="submit" className="btn-primary btn-block" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </button>
              <p className="meta">
                Trouble signing in? Ask your supervisor to reset your password.
              </p>
            </form>
          </div>
          <PwaInstallCta />
        </div>
        <div className="login-r">
          <div style={{ maxWidth: 300, width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
            <p className="ptitle-s">Continue as</p>
            <div
              ref={groupRef}
              role="radiogroup"
              aria-label="Continue as"
              onKeyDown={onGroupKey}
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
            >
              {DESKS.map((d) => {
                const on = d.id === desk;
                return (
                  <button
                    key={d.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    tabIndex={on ? 0 : -1}
                    className={`opt role-opt${on ? " is-on" : ""}`}
                    onClick={() => setDesk(d.id)}
                  >
                    <span>
                      <span className="pname">{d.name}</span>
                      <br />
                      <span className="pmeta">{d.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="meta" aria-live="polite" style={{ marginTop: 4 }}>
              {active.hint}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
