"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/office/orders", label: "Orders" },
  { href: "/office/products", label: "Products" },
  { href: "/office/customers", label: "Customers" },
  { href: "/office/bookers", label: "Bookers" },
  { href: "/office/reports", label: "Reports" },
  { href: "/office/settings", label: "Settings" },
];

export function OfficeNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {LINKS.map((l) => {
        const active = pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              active
                ? "bg-primary-soft text-primary"
                : "text-muted hover:bg-canvas hover:text-ink"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
