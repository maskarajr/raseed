"use client";

import Link from "next/link";
import { LogoIcon } from "@/components/logo";
import { PlusIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavGroup } from "@/components/nav-group";
import { officeNavGroups } from "@/components/app-shared";

export function AppSidebar() {
  return (
    <Sidebar className="no-print" collapsible="icon" variant="floating">
      <SidebarHeader className="h-14 justify-center px-2">
        <SidebarMenuButton render={<Link href="/office" />} tooltip="Raseed">
          <LogoIcon className="size-5" />
          <span className="font-medium text-primary">Raseed</span>
        </SidebarMenuButton>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
                render={<Link href="/office/products?new=1" />}
                tooltip="New product"
              >
                <PlusIcon />
                <span>New product</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        {officeNavGroups.map((group) => (
          <NavGroup key={group.label} {...group} />
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
