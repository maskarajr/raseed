"use client";

import type { ReactNode } from "react";
import {
  LayoutGridIcon,
  BarChart3Icon,
  ShoppingBagIcon,
  FileTextIcon,
  PackageIcon,
  UsersIcon,
  SettingsIcon,
} from "lucide-react";

export type SidebarNavItem = {
  title: string;
  path: string;
  icon?: ReactNode;
  match?: "exact" | "prefix";
};

export type SidebarNavGroup = {
  label: string;
  items: SidebarNavItem[];
};

export const officeNavGroups: SidebarNavGroup[] = [
  {
    label: "Overview",
    items: [
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
    ],
  },
  {
    label: "Store",
    items: [
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
        title: "Products",
        path: "/office/products",
        match: "prefix",
        icon: <PackageIcon />,
      },
      {
        title: "Customers",
        path: "/office/customers",
        match: "prefix",
        icon: <UsersIcon />,
      },
    ],
  },
];

const allNavItems: SidebarNavItem[] = officeNavGroups.flatMap((g) => g.items);

export function navTitleForPath(pathname: string): SidebarNavItem {
  const prefixHit = allNavItems.find(
    (item) =>
      item.match === "prefix" &&
      item.path !== "/office" &&
      pathname.startsWith(item.path),
  );
  if (prefixHit) return prefixHit;
  if (pathname.startsWith("/office/settings")) {
    return {
      title: "Settings",
      path: "/office/settings",
      icon: <SettingsIcon />,
    };
  }
  if (pathname.startsWith("/office/bookers")) {
    return { title: "Bookers", path: "/office/bookers", icon: <UsersIcon /> };
  }
  if (pathname.startsWith("/office/stock")) {
    return { title: "Stock", path: "/office/stock", icon: <PackageIcon /> };
  }
  return allNavItems[0]!;
}

export function isNavActive(pathname: string, item: SidebarNavItem): boolean {
  if (item.match === "exact") return pathname === item.path;
  return pathname.startsWith(item.path);
}
