"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { SettingsIcon, UsersIcon, LogOutIcon } from "lucide-react";
import { api } from "@/lib/client";

export function NavUser({ name, role }: { name: string; role: string }) {
  const router = useRouter();
  const initial = name.trim().charAt(0).toUpperCase() || "R";

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Avatar className="size-8" />}>
        <AvatarFallback>{initial}</AvatarFallback>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-3 p-2 font-normal text-foreground">
            <Avatar className="size-10">
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <span className="block font-medium text-foreground">{name}</span>
              <span className="block truncate text-muted-foreground text-xs">
                {role}
              </span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href="/office/settings" />}>
            <SettingsIcon />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/office/bookers" />}>
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
