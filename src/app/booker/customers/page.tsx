"use client";

import { useEffect, useState } from "react";
import type { Customer } from "@prisma/client";
import { api } from "@/lib/client";

export default function BookerCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    try {
      const q = search ? `?search=${encodeURIComponent(search)}` : "";
      const { customers } = await api<{ customers: Customer[] }>(
        `/api/customers${q}`,
      );
      setCustomers(customers);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Shops</h1>
        <button
          className="btn-primary text-sm"
          onClick={() => setShowCreate((s) => !s)}
        >
          {showCreate ? "Close" : "+ Add"}
        </button>
      </div>
      {error && <p className="text-red-600">{error}</p>}

      {showCreate && (
        <NewCustomer
          onSaved={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}

      <div className="flex gap-2">
        <input
          className="input"
          placeholder="Search shops…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <button className="btn-secondary" onClick={load}>
          Go
        </button>
      </div>

      <div className="space-y-2">
        {customers.map((c) => (
          <div key={c.id} className="card">
            <p className="font-medium">{c.name}</p>
            <p className="text-sm text-slate-500">
              {c.phone} · {c.area ?? "—"}
            </p>
          </div>
        ))}
        {customers.length === 0 && (
          <p className="text-center text-sm text-slate-500">No shops found.</p>
        )}
      </div>
    </div>
  );
}

function NewCustomer({ onSaved }: { onSaved: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api("/api/customers", {
        method: "POST",
        body: JSON.stringify({
          name,
          phone,
          area: area || undefined,
          address: address || undefined,
        }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="card space-y-3">
      <h2 className="font-semibold">New shop</h2>
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
        <label className="label">Phone</label>
        <input
          className="input"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label">Area</label>
        <input
          className="input"
          value={area}
          onChange={(e) => setArea(e.target.value)}
        />
      </div>
      <div>
        <label className="label">Address</label>
        <input
          className="input"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn-primary w-full" disabled={saving}>
        {saving ? "Saving…" : "Save shop"}
      </button>
    </form>
  );
}
