"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";

export function BookerNav() {
  const pathname = usePathname();
  const items = [
    {
      href: "/booker",
      label: "Home",
      icon: "home" as const,
      on: pathname === "/booker",
    },
    {
      href: "/booker/orders",
      label: "Orders",
      icon: "orders" as const,
      on:
        pathname.startsWith("/booker/orders") &&
        pathname !== "/booker/orders/new",
    },
    {
      href: "/booker/orders/new",
      label: "New",
      icon: "plus" as const,
      on: pathname === "/booker/orders/new",
    },
    {
      href: "/booker/account",
      label: "Account",
      icon: "user" as const,
      on: pathname.startsWith("/booker/account"),
    },
  ];
  return (
    <nav className="ptabs">
      {items.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`ptab${l.on ? " is-on" : ""}`}
        >
          <Icon name={l.icon} />
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
