"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AppBreadcrumbs } from "@/components/app-breadcrumbs";
import { CustomSidebarTrigger } from "@/components/custom-sidebar-trigger";
import { navTitleForPath } from "@/components/app-shared";
import { NavUser } from "@/components/nav-user";
import { BellIcon } from "lucide-react";

export function AppHeader({
  userName,
  userRole,
}: {
  userName: string;
  userRole: string;
}) {
  const pathname = usePathname();
  const page = navTitleForPath(pathname);

  return (
    <header
      className={cn(
        "no-print mb-8 flex min-h-10 items-center justify-between gap-3 px-1 md:px-2",
      )}
    >
      <div className="flex items-center gap-3">
        <CustomSidebarTrigger />
        <Separator
          className="mr-2 h-4 data-[orientation=vertical]:self-center"
          orientation="vertical"
        />
        <AppBreadcrumbs page={{ title: page.title, icon: page.icon }} />
      </div>
      <div className="flex items-center gap-3">
        <Button aria-label="Notifications" size="icon" variant="ghost">
          <BellIcon />
        </Button>
        <Separator
          className="h-4 data-[orientation=vertical]:self-center"
          orientation="vertical"
        />
        <NavUser name={userName} role={userRole} />
      </div>
    </header>
  );
}
