"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { OfficeChrome } from "@/components/OfficeChrome";
import { StatusPill } from "@/components/badges";
import { SideSheet } from "@/components/SideSheet";

type Booker = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  route: string | null;
  active: boolean;
  createdAt: string;
  ordersToday: number;
  valueToday: number;
  collectedToday: number;
};

export default function BookersPage() {
  const [bookers, setBookers] = useState<Booker[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [route, setRoute] = useState("");

  async function load() {
    try {
      const { bookers: rows } = await api<{ bookers: Booker[] }>("/api/bookers");
      setBookers(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api("/api/bookers", {
        method: "POST",
        body: JSON.stringify({ name, email, password, phone, route }),
      });
      setName("");
      setEmail("");
      setPassword("");
      setOpen(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  async function toggle(b: Booker) {
    await api(`/api/bookers/${b.id}`, {
      method: "PATCH",
      body: JSON.stringify({ active: !b.active }),
    });
    load();
  }

  return (
    <OfficeChrome
      title="Bookers"
      subtitle={`${bookers.filter((b) => b.active).length} on the road`}
      actions={
        <button className="btn-primary" onClick={() => setOpen(true)}>
          Add booker
        </button>
      }
    >
      {error && <p className="muted">{error}</p>}
      <div className="card2 grow">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Booker</th>
                <th>Route</th>
                <th>Phone</th>
                <th className="r">Orders today</th>
                <th className="r">Value today</th>
                <th className="r">Collected</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {bookers.map((b) => (
                <tr key={b.id}>
                  <td>
                    <div className="person">
                      <span className="avatar">
                        {b.name
                          .split(" ")
                          .map((p) => p[0])
                          .join("")
                          .slice(0, 2)}
                      </span>
                      {b.name}
                    </div>
                  </td>
                  <td className="sku">{b.route ?? "—"}</td>
                  <td className="num">{b.phone ?? "—"}</td>
                  <td className="r num">{b.ordersToday}</td>
                  <td className="money">{b.valueToday.toLocaleString("en-PK")}</td>
                  <td className="money">{b.collectedToday.toLocaleString("en-PK")}</td>
                  <td>
                    <StatusPill status={b.active ? "active" : "inactive"} />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={() => toggle(b)}
                    >
                      {b.active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={async () => {
                        const password = prompt("New password (min 6)") ?? "";
                        if (password.length < 6) return;
                        await api(`/api/bookers/${b.id}`, {
                          method: "PATCH",
                          body: JSON.stringify({ password }),
                        });
                        load();
                      }}
                    >
                      Reset PIN
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {bookers.length === 0 && <p className="tbl-empty">No bookers.</p>}
        </div>
      </div>
      {open && (
        <SideSheet title="Add booker" onClose={() => setOpen(false)}>
          <form onSubmit={create} className="stack">
            <div className="lfield">
              <label>Name</label>
              <input
                className="linput"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="lfield">
              <label>Email</label>
              <input
                className="linput"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="lfield">
              <label>Route</label>
              <input
                className="linput"
                value={route}
                onChange={(e) => setRoute(e.target.value)}
              />
            </div>
            <div className="lfield">
              <label>Phone</label>
              <input
                className="linput"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="lfield">
              <label>Password</label>
              <input
                className="linput"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <button className="btn-primary btn-block">Create</button>
          </form>
        </SideSheet>
      )}
    </OfficeChrome>
  );
}
