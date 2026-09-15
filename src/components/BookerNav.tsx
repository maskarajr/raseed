"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";

const LINKS = [
  { href: "/booker", label: "Home", icon: "home" as const, exact: true },
  { href: "/booker/orders", label: "Orders", icon: "orders" as const },
  { href: "/booker/account", label: "Account", icon: "user" as const },
];

export function BookerNav() {
  const pathname = usePathname();
  return (
    <nav className="ptabs">
      {LINKS.map((l) => {
        const on = l.exact ? pathname === l.href : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`ptab${on ? " is-on" : ""}`}
          >
            <Icon name={l.icon} />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
