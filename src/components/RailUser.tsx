"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { api } from "@/lib/client";
import { initials } from "@/lib/person";

export function RailUser({ name, role }: { name: string; role: string }) {
  const router = useRouter();

  async function signOut() {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="ruser-wrap">
      <Link
        href="/office/settings"
        className="ruser"
        aria-label={`Profile — ${name}`}
      >
        <span className="avatar">{initials(name)}</span>
        <span className="ruser-tx">
          <span className="pname">{name}</span>
          <span className="pmeta">{role}</span>
        </span>
      </Link>
      <button
        type="button"
        className="rsignout"
        aria-label="Sign out"
        onClick={signOut}
      >
        <Icon name="logout" className="ic ic-sm" />
        <span className="rsignout-t">Sign out</span>
      </button>
    </div>
  );
}
