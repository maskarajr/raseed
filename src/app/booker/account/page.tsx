"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { LogoutButton } from "@/components/LogoutButton";

type Me = { name: string; email: string; role: string } | null;

export default function BookerAccountPage() {
  const [me, setMe] = useState<Me>(null);

  useEffect(() => {
    api<{ user: Me }>("/api/auth/me").then((d) => setMe(d.user));
  }, []);

  return (
    <div className="space-y-4 px-4 pt-5">
      <h1 className="text-xl font-bold">Account</h1>
      <div className="card space-y-2">
        <Row label="Name" value={me?.name ?? "…"} />
        <Row label="Email" value={me?.email ?? "…"} />
        <Row label="Role" value={me?.role ?? "…"} />
        <Row label="Currency" value="PKR" />
        <Row label="Language" value="English" />
      </div>
      <LogoutButton />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-1.5 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
