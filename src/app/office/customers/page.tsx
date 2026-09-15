"use client";

import { useEffect, useState } from "react";
import type { Customer } from "@prisma/client";
import { api } from "@/lib/client";
import { SideSheet } from "@/components/SideSheet";
import { OfficeChrome } from "@/components/OfficeChrome";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ mode: "create" | "edit"; customer?: Customer } | null>(
    null,
  );

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
    <OfficeChrome
      title="Customers"
      actions={
        <button className="btn-primary" onClick={() => setSheet({ mode: "create" })}>
          New customer
        </button>
      }
    >
      {error && <p className="text-sm text-danger">{error}</p>}

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
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.name}</td>
                  <td>{c.phone || "—"}</td>
                  <td>{c.area ?? "—"}</td>
                  <td className="text-right">
                    <button
                      className="text-sm text-primary"
                      onClick={() => setSheet({ mode: "edit", customer: c })}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-muted">
                    No customers.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {sheet && (
        <CustomerSheet
          customer={sheet.mode === "edit" ? sheet.customer : undefined}
          onClose={() => setSheet(null)}
          onSaved={() => {
            setSheet(null);
            load();
          }}
        />
      )}
    </OfficeChrome>
  );
}

function CustomerSheet({
  customer,
  onClose,
  onSaved,
}: {
  customer?: Customer;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!customer;
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [area, setArea] = useState(customer?.area ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = JSON.stringify({
        name,
        phone,
        area: area || (isEdit ? null : undefined),
      });
      if (isEdit) {
        await api(`/api/customers/${customer!.id}`, { method: "PATCH", body });
      } else {
        await api("/api/customers", { method: "POST", body });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  return (
    <SideSheet
      title={isEdit ? "Edit customer" : "New customer"}
      onClose={onClose}
    >
      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="label">
            Name <span className="text-danger">*</span>
          </label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div>
          <label className="label">Phone</label>
          <input
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
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
        {error && <p className="text-sm text-danger">{error}</p>}
        <button className="btn-primary w-full" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
    </SideSheet>
  );
}
