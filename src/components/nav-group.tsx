"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { isNavActive, type SidebarNavGroup } from "@/components/app-shared";

export function NavGroup({ label, items }: SidebarNavGroup) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      {label ? <SidebarGroupLabel>{label}</SidebarGroupLabel> : null}
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.path}>
            <SidebarMenuButton
              isActive={isNavActive(pathname, item)}
              render={<Link href={item.path} />}
              tooltip={item.title}
            >
              {item.icon}
              <span>{item.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
