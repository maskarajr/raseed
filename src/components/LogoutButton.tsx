"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { api } from "@/lib/client";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }
  if (compact) {
    return (
      <button
        onClick={logout}
        className="flex h-10 w-full items-center gap-3 rounded-md px-2.5 text-sm text-muted hover:bg-canvas hover:text-ink"
        aria-label="Sign out"
      >
        <LogOut className="h-5 w-5 shrink-0" aria-hidden />
        <span className="truncate opacity-0 transition-opacity duration-150 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100">
          Sign out
        </span>
      </button>
    );
  }
  return (
    <button onClick={logout} className="btn-secondary text-xs">
      Sign out
    </button>
  );
}
