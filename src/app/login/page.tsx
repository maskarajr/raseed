"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import type { Role } from "@/lib/enums";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [asRole, setAsRole] = useState<"owner" | "booker">("owner");
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
      const dest = user.role === "booker" ? "/booker" : "/office";
      // Full navigation: Fast Refresh / router.replace can no-op after login.
      window.location.assign(dest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login" style={{ minHeight: "100vh" }}>
      <div className="login-l">
        <p className="eyebrow">Raseed</p>
        <h1 className="ptitle" style={{ margin: "8px 0 24px" }}>
          Sign in
        </h1>
        <form onSubmit={onSubmit} className="stack" style={{ maxWidth: 380 }}>
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
          <div className="lfield">
            <span className="muted" style={{ fontSize: 12 }}>
              Continue as
            </span>
            <div className="stack" style={{ gap: 8 }}>
              {(
                [
                  ["owner", "Owner — office dashboard"],
                  ["booker", "Booker — capture PWA"],
                ] as const
              ).map(([id, copy]) => (
                <button
                  key={id}
                  type="button"
                  className={`opt${asRole === id ? " is-on" : ""}`}
                  onClick={() => setAsRole(id)}
                >
                  {copy}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="muted">{error}</p>}
          <button
            type="submit"
            className="btn-primary btn-block"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
      <div className="login-r">
        <div>
          <p className="eyebrow">Wholesale ops</p>
          <p className="h3s" style={{ marginTop: 8 }}>
            Book, invoice, collect cash.
          </p>
          <p className="muted" style={{ marginTop: 10, maxWidth: 280 }}>
            PKR · English · office hours 09:00–19:00 Asia/Karachi
          </p>
        </div>
      </div>
    </main>
  );
}
