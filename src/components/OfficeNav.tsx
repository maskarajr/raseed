"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";

const OVERVIEW = [
  { href: "/office", label: "Dashboard", icon: "home" as const, exact: true },
  { href: "/office/reports", label: "Reports", icon: "chart" as const },
];

const STORE = [
  { href: "/office/orders", label: "Orders", icon: "orders" as const },
  { href: "/office/invoices", label: "Invoices", icon: "invoice" as const },
  { href: "/office/products", label: "Products", icon: "box" as const },
  { href: "/office/customers", label: "Customers", icon: "people" as const },
];

const FOOT = [
  { href: "/office/bookers", label: "Bookers", icon: "user" as const },
  { href: "/office/stock", label: "Stock", icon: "ledger" as const },
  { href: "/office/settings", label: "Settings", icon: "gear" as const },
];

function NavLink({
  href,
  label,
  icon,
  exact,
}: {
  href: string;
  label: string;
  icon: Parameters<typeof Icon>[0]["name"];
  exact?: boolean;
}) {
  const pathname = usePathname();
  const on = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link href={href} className={`ritem${on ? " is-on" : ""}`}>
      <Icon name={icon} />
      {label}
    </Link>
  );
}

export function OfficeNav({ variant }: { variant: "main" | "foot" }) {
  if (variant === "foot") {
    return (
      <>
        {FOOT.map((l) => (
          <NavLink key={l.href} {...l} />
        ))}
      </>
    );
  }
  return (
    <nav className="rnav">
      <p className="rgroup">Overview</p>
      {OVERVIEW.map((l) => (
        <NavLink key={l.href} {...l} />
      ))}
      <p className="rgroup">Store</p>
      {STORE.map((l) => (
        <NavLink key={l.href} {...l} />
      ))}
    </nav>
  );
}
