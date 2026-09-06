"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";

type Booker = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  createdAt: string;
};

export default function BookersPage() {
  const [bookers, setBookers] = useState<Booker[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function load() {
    try {
      const { bookers } = await api<{ bookers: Booker[] }>("/api/bookers");
      setBookers(bookers);
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
        body: JSON.stringify({ name, email, password }),
      });
      setName("");
      setEmail("");
      setPassword("");
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
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Bookers</h1>
      {error && <p className="text-red-600">{error}</p>}

      <form onSubmit={create} className="card grid grid-cols-1 gap-3 sm:grid-cols-4">
        <h2 className="col-span-full font-semibold">New booker account</h2>
        <div>
          <label className="label">Name</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            className="input"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>
        <div className="flex items-end">
          <button className="btn-primary w-full">Create</button>
        </div>
      </form>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bookers.map((b) => (
                <tr key={b.id}>
                  <td className="font-medium">{b.name}</td>
                  <td>{b.email}</td>
                  <td>
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        b.active
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {b.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="text-xs text-slate-500">
                    {new Date(b.createdAt).toLocaleDateString()}
                  </td>
                  <td className="text-right">
                    <button
                      className="text-sm text-slate-500"
                      onClick={() => toggle(b)}
                    >
                      {b.active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
              {bookers.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-slate-500">
                    No bookers.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
