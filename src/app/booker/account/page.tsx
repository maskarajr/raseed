"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { LogoutButton } from "@/components/LogoutButton";
import { BookerChrome } from "@/components/BookerChrome";

type Me = { name: string; email: string; role: string } | null;

export default function BookerAccountPage() {
  const [me, setMe] = useState<Me>(null);

  useEffect(() => {
    api<{ user: Me }>("/api/auth/me").then((d) => setMe(d.user));
  }, []);

  return (
    <BookerChrome title="Account">
      <div className="pcard">
        <div className="prow">
          <span className="muted">Name</span>
          <span>{me?.name ?? "…"}</span>
        </div>
        <div className="prow">
          <span className="muted">Email</span>
          <span>{me?.email ?? "…"}</span>
        </div>
        <div className="prow">
          <span className="muted">Role</span>
          <span>{me?.role ?? "…"}</span>
        </div>
        <div className="prow">
          <span className="muted">Currency</span>
          <span>PKR</span>
        </div>
        <div className="prow">
          <span className="muted">Language</span>
          <span>English</span>
        </div>
      </div>
      <LogoutButton />
    </BookerChrome>
  );
}
