"use client";

import { useEffect, useState } from "react";
import type { Customer } from "@prisma/client";
import { api } from "@/lib/client";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Customer | null>(null);
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
        <h1 className="text-2xl font-bold">Customers</h1>
        <button
          className="btn-primary"
          onClick={() => {
            setShowCreate((s) => !s);
            setEditing(null);
          }}
        >
          {showCreate ? "Close" : "Add customer"}
        </button>
      </div>
      {error && <p className="text-red-600">{error}</p>}

      {showCreate && (
        <CustomerForm
          onSaved={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
      {editing && (
        <CustomerForm
          customer={editing}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      <div className="card">
        <div className="mb-3 flex gap-2">
          <input
            className="input"
            placeholder="Search name, phone, area…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
          />
          <button className="btn-secondary" onClick={load}>
            Search
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Area</th>
                <th>Address</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.name}</td>
                  <td>{c.phone}</td>
                  <td>{c.area ?? "—"}</td>
                  <td className="text-slate-500">{c.address ?? "—"}</td>
                  <td className="text-right">
                    <button
                      className="text-sm text-brand-600"
                      onClick={() => {
                        setEditing(c);
                        setShowCreate(false);
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-slate-500">
                    No customers.
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

function CustomerForm({
  customer,
  onSaved,
}: {
  customer?: Customer;
  onSaved: () => void;
}) {
  const isEdit = !!customer;
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [area, setArea] = useState(customer?.area ?? "");
  const [address, setAddress] = useState(customer?.address ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const body = JSON.stringify({
        name,
        phone,
        area: area || (isEdit ? null : undefined),
        address: address || (isEdit ? null : undefined),
      });
      if (isEdit) {
        await api(`/api/customers/${customer!.id}`, { method: "PATCH", body });
      } else {
        await api("/api/customers", { method: "POST", body });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="card grid grid-cols-1 gap-3 sm:grid-cols-2">
      <h2 className="col-span-full font-semibold">
        {isEdit ? `Edit ${customer!.name}` : "New customer"}
      </h2>
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
      {error && <p className="col-span-full text-sm text-red-600">{error}</p>}
      <div className="col-span-full">
        <button className="btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
