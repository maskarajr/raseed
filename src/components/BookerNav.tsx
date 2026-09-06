"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/booker", label: "Home", icon: "🏠" },
  { href: "/booker/orders", label: "Orders", icon: "📦" },
  { href: "/booker/account", label: "Account", icon: "👤" },
];

export function BookerNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {LINKS.map((l) => {
          const active =
            l.href === "/booker"
              ? pathname === "/booker"
              : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-xs ${
                active ? "text-primary" : "text-muted"
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
