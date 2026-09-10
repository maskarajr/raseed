"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const LINKS: { href: string; label: string; icon: ReactNode; exact?: boolean }[] =
  [
    { href: "/office", label: "Home", icon: <IconHome />, exact: true },
    { href: "/office/orders", label: "Orders", icon: <IconOrders /> },
    { href: "/office/products", label: "Products", icon: <IconProducts /> },
    { href: "/office/customers", label: "Customers", icon: <IconCustomers /> },
    { href: "/office/bookers", label: "Bookers", icon: <IconBookers /> },
    { href: "/office/reports", label: "Reports", icon: <IconReports /> },
    { href: "/office/settings", label: "Settings", icon: <IconSettings /> },
  ];

export function OfficeNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {LINKS.map((l) => {
        const active = l.exact
          ? pathname === l.href
          : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`flex min-h-[40px] items-center gap-2.5 rounded px-3 py-2 text-sm font-medium ${
              active
                ? "bg-primary-soft text-primary"
                : "text-muted hover:bg-canvas hover:text-ink"
            }`}
          >
            <span className="shrink-0" aria-hidden>
              {l.icon}
            </span>
            <span>{l.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function IconHome() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M2.5 7.2 8 2.5l5.5 4.7V13.5H9.2V9.4H6.8v4.1H2.5V7.2Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconOrders() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="3" y="2.5" width="10" height="11" rx="1" stroke="currentColor" strokeWidth="1.25" />
      <path d="M5.5 6h5M5.5 8.5h5M5.5 11h3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function IconProducts() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M3 5.5 8 3l5 2.5v5.5L8 13.5 3 11V5.5Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path d="M8 8v5.5M3 5.5 8 8l5-2.5" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

function IconCustomers() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="5.5" r="2.25" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M3.5 13c.6-2.2 2.2-3.5 4.5-3.5s3.9 1.3 4.5 3.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconBookers() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="6" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="11" cy="6.5" r="1.6" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M2.5 13c.5-2 1.9-3.1 3.6-3.1 1.2 0 2.2.5 2.9 1.3M9.2 10.2c.5-.2 1.1-.3 1.7-.3 1.5 0 2.7.9 3.1 2.3"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconReports() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3.5 12.5v-3h2.5v3M6.75 12.5v-6h2.5v6M10 12.5V4h2.5v8.5" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M8 2.5v1.4M8 12.1v1.4M2.5 8h1.4M12.1 8h1.4M4.1 4.1l1 .99M10.9 10.91l1 .99M11.9 4.1l-1 .99M5.1 10.91l-1 .99"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}
