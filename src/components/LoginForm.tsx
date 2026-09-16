"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import type { Role } from "@/lib/enums";
import { PwaInstallCta } from "@/components/PwaInstallCta";
import { BrandMark } from "@/components/BrandMark";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        <div className="login-l" style={{ gap: 18 }}>
          <div className="rbrand" style={{ padding: 0 }}>
            <BrandMark compact className="rmark" />
            Raseed
          </div>
          <div style={{ maxWidth: "34ch" }}>
            <h1 className="login-h login-h-office">Sign in to the office</h1>
            <h1 className="login-h login-h-booker">Sign in to the route</h1>
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
          <PwaInstallCta />
        </div>
        <div className="login-r">
          <div style={{ maxWidth: 300 }}>
            <p
              className="meta"
              style={{ letterSpacing: ".08em", textTransform: "uppercase" }}
            >
              Raseed
            </p>
            <p
              className="h3s"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                marginTop: 8,
              }}
            >
              One link. The account picks the desk.
            </p>
            <p className="muted" style={{ fontSize: 14, marginTop: 10 }}>
              Office staff land on the rail. Bookers land on the route. No
              switch to choose.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
