"use client";

import { useEffect, useMemo, useState } from "react";
import type { Customer } from "@prisma/client";
import { api } from "@/lib/client";
import { SideSheet } from "@/components/SideSheet";
import { OfficeChrome } from "@/components/OfficeChrome";
import { StatusPill } from "@/components/badges";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{
    mode: "create" | "edit";
    customer?: Customer;
  } | null>(null);

  async function load() {
    try {
      const { customers: rows } = await api<{ customers: Customer[] }>(
        "/api/customers",
      );
      setCustomers(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      `${c.name} ${c.phone} ${c.area ?? ""}`.toLowerCase().includes(q),
    );
  }, [customers, search]);

  return (
    <OfficeChrome
      title="Customers"
      subtitle={`${filtered.length} shown`}
      actions={
        <>
          <input
            className="search"
            placeholder="Shop, area, route"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            className="btn-primary"
            onClick={() => setSheet({ mode: "create" })}
          >
            New customer
          </button>
        </>
      }
    >
      {error && <p className="muted">{error}</p>}
      <div className="card2 grow">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Shop</th>
                <th>Area</th>
                <th>Phone</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSheet({ mode: "edit", customer: c })}
                >
                  <td>{c.name}</td>
                  <td>{c.area ?? "—"}</td>
                  <td className="num">{c.phone || "—"}</td>
                  <td>
                    <StatusPill status="active" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="tbl-empty">No customers match this search.</p>
          )}
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
      <form onSubmit={save} className="stack">
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
          <label>Phone</label>
          <input
            className="linput"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="lfield">
          <label>Area</label>
          <input
            className="linput"
            value={area}
            onChange={(e) => setArea(e.target.value)}
          />
        </div>
        {error && <p className="muted">{error}</p>}
        <div className="row">
          <button type="button" className="btn-sec grow" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary grow" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </SideSheet>
  );
}
