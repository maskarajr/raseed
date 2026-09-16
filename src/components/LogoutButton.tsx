"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    const dest = window.location.pathname.startsWith("/booker")
      ? "/booker/login"
      : "/office/login";
    router.replace(dest);
    router.refresh();
  }
  return (
    <button type="button" onClick={logout} className="btn-ghost btn-sm">
      Sign out
    </button>
  );
}
