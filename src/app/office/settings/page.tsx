"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";

type Me = { name: string; email: string; role: string } | null;

export default function SettingsPage() {
  const [me, setMe] = useState<Me>(null);

  useEffect(() => {
    api<{ user: Me }>("/api/auth/me").then((d) => setMe(d.user));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="card">
        <h2 className="mb-3 font-semibold">Account</h2>
        <dl className="space-y-2 text-sm">
          <Row label="Name" value={me?.name ?? "…"} />
          <Row label="Email" value={me?.email ?? "…"} />
          <Row label="Role" value={me?.role ?? "…"} />
        </dl>
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">Application</h2>
        <dl className="space-y-2 text-sm">
          <Row label="Currency" value="PKR (Rs)" />
          <Row label="Language" value="English" />
          <Row label="Mode" value="Online-only · office hours" />
        </dl>
        <p className="mt-3 text-xs text-muted">
          Bookers are managed under Bookers; products, stock, customers and
          reports each have their own section in the left nav.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-1.5 last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
