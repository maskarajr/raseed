"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  ClipboardList,
  FileText,
  Home,
  LineChart,
  LogOut,
  Package,
  Settings,
  ShoppingBag,
  Users,
  Warehouse,
} from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/office", label: "Home", icon: Home, exact: true },
  { href: "/office/orders", label: "Orders", icon: ClipboardList },
  { href: "/office/invoices", label: "Invoices", icon: FileText },
  { href: "/office/products", label: "Products", icon: Package },
  { href: "/office/stock", label: "Stock", icon: Warehouse },
  { href: "/office/customers", label: "Customers", icon: Users },
  { href: "/office/bookers", label: "Bookers", icon: ShoppingBag },
  { href: "/office/reports", label: "Reports", icon: LineChart },
  { href: "/office/settings", label: "Settings", icon: Settings },
] as const;

export function OfficeNav({ expanded }: { expanded: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-1 px-2 py-3">
      {LINKS.map((l) => {
        const active =
          "exact" in l && l.exact
            ? pathname === l.href
            : pathname.startsWith(l.href);
        const Icon = l.icon;
        const link = (
          <Link
            href={l.href}
            prefetch={false}
            className={cn(
              "flex h-10 items-center gap-3 rounded-md px-2.5 text-sm font-medium",
              active
                ? "bg-primary-soft text-primary"
                : "text-muted hover:bg-canvas hover:text-ink",
            )}
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden />
            <span className="truncate opacity-0 transition-opacity duration-150 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100">
              {l.label}
            </span>
          </Link>
        );
        if (expanded) return <div key={l.href}>{link}</div>;
        return (
          <Tooltip key={l.href}>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent side="right">{l.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}

export function OfficeShell({
  children,
  userLabel,
}: {
  children: ReactNode;
  userLabel: string;
}) {
  const router = useRouter();
  const [find, setFind] = useState("");
  const [expanded, setExpanded] = useState(false);

  function onFind(e: React.FormEvent) {
    e.preventDefault();
    const q = find.trim();
    router.push(
      q ? `/office/orders?q=${encodeURIComponent(q)}` : "/office/orders",
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex min-h-screen">
        <aside
          className={cn(
            "group/rail no-print relative z-30 flex min-h-screen w-14 shrink-0 flex-col overflow-hidden border-r border-line bg-surface",
            "transition-[width] duration-150 ease-out",
            "hover:w-[200px] hover:min-w-[180px]",
            "focus-within:w-[200px] focus-within:min-w-[180px]",
          )}
          onMouseEnter={() => setExpanded(true)}
          onMouseLeave={() => setExpanded(false)}
          onFocusCapture={() => setExpanded(true)}
          onBlurCapture={(e) => {
            const next = e.relatedTarget as Node | null;
            if (!e.currentTarget.contains(next)) setExpanded(false);
          }}
        >
          <div className="flex h-14 items-center gap-2 border-b border-line px-2.5">
            <Link
              href="/office"
              className="flex min-w-0 items-center gap-2 text-primary"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-soft font-serif text-lg font-semibold">
                R
              </span>
              <span className="truncate font-serif text-lg font-semibold opacity-0 transition-opacity duration-150 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100">
                Raseed
              </span>
            </Link>
          </div>
          <OfficeNav expanded={expanded} />
          <div className="mt-auto border-t border-line p-2">
            <p className="mb-1 truncate px-1 text-[10px] text-muted opacity-0 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100">
              {userLabel}
            </p>
            <LogoutButton compact />
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="no-print flex items-center gap-3 border-b border-line bg-surface px-6 py-3">
            <form onSubmit={onFind} className="w-full max-w-md">
              <Input
                value={find}
                onChange={(e) => setFind(e.target.value)}
                placeholder="Find…"
                aria-label="Find"
              />
            </form>
            <p className="ml-auto hidden truncate text-xs text-muted sm:block">
              {userLabel}
            </p>
          </header>
          <main className="mx-auto w-full max-w-6xl flex-1 px-8 py-8">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
