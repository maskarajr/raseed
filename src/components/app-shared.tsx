"use client";

import type { ReactNode } from "react";
import {
  LayoutGridIcon,
  BarChart3Icon,
  ShoppingBagIcon,
  FileTextIcon,
  UsersIcon,
  SettingsIcon,
} from "lucide-react";

export type SidebarNavItem = {
  title: string;
  path: string;
  icon: ReactNode;
  match: "exact" | "prefix";
};

export const officeNavItems: SidebarNavItem[] = [
  {
    title: "Dashboard",
    path: "/office",
    match: "exact",
    icon: <LayoutGridIcon />,
  },
  {
    title: "Reports",
    path: "/office/reports",
    match: "prefix",
    icon: <BarChart3Icon />,
  },
  {
    title: "Orders",
    path: "/office/orders",
    match: "prefix",
    icon: <ShoppingBagIcon />,
  },
  {
    title: "Invoices",
    path: "/office/invoices",
    match: "prefix",
    icon: <FileTextIcon />,
  },
  {
    title: "Customers",
    path: "/office/customers",
    match: "prefix",
    icon: <UsersIcon />,
  },
  {
    title: "Settings",
    path: "/office/settings",
    match: "prefix",
    icon: <SettingsIcon />,
  },
];

export function navTitleForPath(pathname: string): SidebarNavItem {
  const prefixHit = officeNavItems.find(
    (item) => item.match === "prefix" && pathname.startsWith(item.path),
  );
  if (prefixHit) return prefixHit;
  return officeNavItems[0]!;
}
