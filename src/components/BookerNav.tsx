"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/booker", label: "Home" },
  { href: "/booker/orders", label: "Orders" },
  { href: "/booker/account", label: "Account" },
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
              className={`flex min-h-[44px] flex-1 items-center justify-center py-3 text-sm font-medium ${
                active ? "text-primary" : "text-muted"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
