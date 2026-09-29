"use client";

import { useEffect, useMemo, useRef, useState } from "react";
type Shop = {
  id: string;
  name: string;
  phone: string;
  area: string | null;
  route: string | null;
  ntn?: string | null;
  active: boolean;
  outstanding: number;
  booker: { name: string } | null;
};
import { api } from "@/lib/client";
import { SideSheet } from "@/components/SideSheet";
import { OfficeChrome } from "@/components/OfficeChrome";
import { SkelRows } from "@/components/skeletons";
import { StatusPill } from "@/components/badges";
import { Money } from "@/components/Money";
import {
  busyStart,
  busyEnd,
  lockButtonWidth,
  useBusyLong,
} from "@/lib/busy";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Shop[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [sheet, setSheet] = useState<{
    mode: "create" | "edit";
    customer?: Shop;
  } | null>(null);

  async function load() {
    try {
      const { customers: rows } = await api<{ customers: Shop[] }>(
        "/api/customers",
      );
      setCustomers(rows);
      setLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setLoaded(true);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      `${c.name} ${c.phone} ${c.area ?? ""} ${c.route ?? ""} ${c.booker?.name ?? ""}`.toLowerCase().includes(q),
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
          <table className="tbl store">
            <thead>
              <tr>
                <th>Shop</th>
                <th>Area</th>
                <th>Route</th>
                <th>Booker</th>
                <th className="r">Outstanding</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody className={!loaded ? "g-band" : undefined}>
              {!loaded ? (
                <>
                  <span className="sr-only">Loading customers…</span>
                  <SkelRows
                    cols={[
                      { role: "name" },
                      { role: "word" },
                      { role: "figure" },
                      { role: "person" },
                      { role: "money", r: true },
                      { role: "status" },
                    ]}
                  />
                </>
              ) : (
              filtered.map((c) => (
                <tr
                  key={c.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSheet({ mode: "edit", customer: c })}
                >
                  <td>{c.name}</td>
                  <td>{c.area ?? "—"}</td>
                  <td className="sku">{c.route ?? "—"}</td>
                  <td>{c.booker?.name ?? "—"}</td>
                  <td className="money">
                    {/* G5/gate 33: through <Money>, single grouping; the — at
                        zero is a workload cell convention, not money math. */}
                    {c.outstanding > 0 ? <Money value={c.outstanding} /> : "—"}
                  </td>
                  <td>
                    <StatusPill status={c.active ? "active" : "inactive"} />
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
          {loaded && filtered.length === 0 && (
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
  customer?: Shop;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!customer;
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [area, setArea] = useState(customer?.area ?? "");
  const [route, setRoute] = useState(customer?.route ?? "");
  const [ntn, setNtn] = useState(customer?.ntn ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const long = useBusyLong(saving);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const t0 = busyStart();
    lockButtonWidth(btnRef.current);
    setSaving(true);
    setError(null);
    try {
      const body = JSON.stringify({
        name,
        phone,
        area: area || (isEdit ? null : undefined),
        route: route || (isEdit ? null : undefined),
        ntn: ntn.trim() || (isEdit ? null : undefined),
      });
      if (isEdit) {
        await api(`/api/customers/${customer!.id}`, { method: "PATCH", body });
      } else {
        await api("/api/customers", { method: "POST", body });
      }
      await busyEnd(t0);
      setSaving(false);
      onSaved();
    } catch (err) {
      await busyEnd(t0);
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
        <div className="lfield">
          <label>Route</label>
          <input
            className="linput"
            value={route}
            onChange={(e) => setRoute(e.target.value)}
          />
        </div>
        <div className="lfield">
          <label>NTN</label>
          <input
            className="linput"
            value={ntn}
            maxLength={40}
            placeholder="e.g. 4218873-6"
            onChange={(e) => setNtn(e.target.value)}
          />
        </div>
        {error && <p className="muted">{error}</p>}
        <div className="row">
          <button type="button" className="btn-sec grow" onClick={onClose}>
            Cancel
          </button>
          <button
            ref={btnRef}
            className={`btn-primary grow${saving ? " is-busy" : ""}`}
            disabled={saving}
            aria-disabled={saving || undefined}
            aria-busy={saving || undefined}
          >
            {saving && <span className="btn-spin" />}
            {saving ? (long ? "Still working…" : "Saving…") : "Save"}
          </button>
        </div>
      </form>
    </SideSheet>
  );
}
