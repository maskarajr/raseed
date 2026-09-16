"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { Role } from "@/lib/enums";
import { PwaInstallCta } from "@/components/PwaInstallCta";
import { isStandalone } from "@/lib/pwaInstall";

export function LoginForm({ surface }: { surface: "office" | "booker" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [asRole, setAsRole] = useState<"office" | "booker">(
    surface === "booker" ? "booker" : "office",
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (surface === "office" && isStandalone()) {
      window.location.replace("/booker/login");
    }
  }, [surface]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const role = surface === "booker" ? "booker" : asRole;
    try {
      const { user } = await api<{ user: { role: Role } }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, asRole: role }),
      });
      const dest = user.role === "booker" ? "/booker" : "/office";
      window.location.assign(dest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  const heading =
    surface === "booker" || asRole === "booker"
      ? "Sign in to the route"
      : "Sign in to the office";

  return (
    <main
      className={surface === "booker" ? "login login-booker" : "login"}
      style={{ minHeight: "100vh" }}
    >
      <div className="login-l" style={{ gap: 18 }}>
        <div className="row" style={{ gap: 9 }}>
          <span className="rmark">R</span>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 19,
              fontWeight: 600,
            }}
          >
            Raseed
          </span>
        </div>
        <div style={{ maxWidth: "34ch" }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 28,
              letterSpacing: "-.02em",
            }}
          >
            {heading}
          </h1>
          <p className="muted" style={{ fontSize: 14, marginTop: 8 }}>
            Office hours 09:00–19:00 · Asia/Karachi
          </p>
        </div>
        <form
          onSubmit={onSubmit}
          className="stack"
          style={{ maxWidth: 340, gap: 14 }}
        >
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
          <button
            type="submit"
            className="btn-primary btn-block"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
          <p className="meta">
            Trouble signing in? Ask your supervisor to reset your password.
          </p>
        </form>
        {surface === "booker" ? <PwaInstallCta /> : null}
      </div>
      {surface === "office" ? (
        <div className="login-r">
          <div
            style={{
              maxWidth: 300,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <p className="ptitle-s">Continue as</p>
            <button
              type="button"
              className={`opt${asRole === "office" ? " is-on" : ""}`}
              onClick={() => setAsRole("office")}
            >
              <span>
                <span className="pname">Office</span>
                <br />
                <span className="pmeta">Dashboard, orders, invoices</span>
              </span>
            </button>
            <button
              type="button"
              className={`opt${asRole === "booker" ? " is-on" : ""}`}
              onClick={() => setAsRole("booker")}
            >
              <span>
                <span className="pname">Booker</span>
                <br />
                <span className="pmeta">Route, capture, collections</span>
              </span>
            </button>
            <p className="meta" style={{ marginTop: 4 }}>
              {asRole === "office"
                ? "Desktop app · full rail"
                : "Phone layout · route first"}
            </p>
          </div>
        </div>
      ) : null}
    </main>
  );
}
