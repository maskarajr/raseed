"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/booker", label: "Home", icon: "🏠" },
  { href: "/booker/orders/new", label: "New", icon: "➕" },
  { href: "/booker/orders", label: "Orders", icon: "📦" },
  { href: "/booker/customers", label: "Shops", icon: "🏪" },
];

export function BookerNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {LINKS.map((l) => {
          const active =
            l.href === "/booker"
              ? pathname === "/booker"
              : pathname === l.href ||
                (l.href === "/booker/orders" &&
                  pathname.startsWith("/booker/orders") &&
                  pathname !== "/booker/orders/new");
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
                active ? "text-brand-600" : "text-slate-500"
              }`}
            >
              <span className="text-lg">{l.icon}</span>
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
