"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";

export function AppShell({
  children,
  userName,
  userRole,
}: {
  children: React.ReactNode;
  userName: string;
  userRole: string;
}) {
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen>
        <AppSidebar />
        <SidebarInset className="gap-5 p-4 md:px-6 md:py-5">
          <AppHeader userName={userName} userRole={userRole} />
          <div className="flex flex-1 flex-col gap-4">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
