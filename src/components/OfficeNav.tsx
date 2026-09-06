"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/office", label: "Dashboard" },
  { href: "/office/orders", label: "Orders" },
  { href: "/office/invoices", label: "Invoices" },
  { href: "/office/products", label: "Products" },
  { href: "/office/stock", label: "Stock" },
  { href: "/office/customers", label: "Customers" },
  { href: "/office/bookers", label: "Bookers" },
  { href: "/office/reports", label: "Reports" },
];

export function OfficeNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1">
      {LINKS.map((l) => {
        const active =
          l.href === "/office"
            ? pathname === "/office"
            : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              active
                ? "bg-brand-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
