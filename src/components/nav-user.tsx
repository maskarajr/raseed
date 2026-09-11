"use client";

import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buttonVariants } from "@/components/ui/button";
import { SettingsIcon, UsersIcon, LogOutIcon } from "lucide-react";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";

function formatRole(role: string): string {
  const t = role.trim();
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function NavUser({ name, role }: { name: string; role: string }) {
  const router = useRouter();
  const initial = name.trim().charAt(0).toUpperCase() || "R";
  const roleLabel = formatRole(role);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "cursor-pointer rounded-full",
        )}
      >
        <Avatar className="size-8">
          <AvatarFallback className="bg-primary text-sm text-primary-foreground">
            {initial}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-3 p-2 font-normal text-foreground">
            <Avatar className="size-10">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {initial}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <span className="block truncate font-medium text-foreground">
                {name}
              </span>
              <span className="block truncate text-muted-foreground text-xs">
                {roleLabel}
              </span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="w-full cursor-pointer"
            onClick={() => router.push("/office/settings")}
          >
            <SettingsIcon />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem
            className="w-full cursor-pointer"
            onClick={() => router.push("/office/bookers")}
          >
            <UsersIcon />
            Bookers
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="w-full cursor-pointer"
            onClick={() => void logout()}
            variant="destructive"
          >
            <LogOutIcon />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
