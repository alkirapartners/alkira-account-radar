"use client";

import * as Menu from "@radix-ui/react-dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Settings } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { getMe } from "@/lib/brief-api";

const ITEM =
  "flex h-11 cursor-pointer select-none items-center gap-3 rounded-[10px] px-3 text-sm text-ink outline-none " +
  "transition-colors duration-fast data-[highlighted]:bg-ink/5";

const SIGN_OUT_HREF = "/api/auth/signout";
const SETTINGS_HREF = "/admin.html";

export function UserMenu() {
  const { data: me, isPending } = useQuery({ queryKey: ["me"], queryFn: getMe, staleTime: Infinity });

  if (isPending) return <Skeleton className="h-9 w-9 rounded-full" />;

  const initial = me?.email.charAt(0).toUpperCase() ?? "";

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={me ? `Account menu for ${me.email}` : "Account menu"}
        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white transition-transform duration-fast ease-out after:absolute after:-inset-1 after:content-[''] hover:scale-105 active:scale-95"
      >
        {initial || <LogOut className="h-4 w-4" aria-hidden="true" />}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          align="end"
          sideOffset={10}
          className="z-50 min-w-[240px] origin-top-right rounded-2xl border border-line bg-surface p-1.5 shadow-lift data-[state=open]:animate-[menu-in_150ms_var(--ease-out)]"
        >
          {me ? (
            <>
              <Menu.Label className="px-3 pb-2 pt-2.5">
                <span className="micro-label block">Signed in as</span>
                <span className="mt-1.5 block truncate text-sm font-medium text-ink">{me.email}</span>
              </Menu.Label>
              <Menu.Separator className="mx-1.5 my-1 h-px bg-line" />
            </>
          ) : null}
          {me?.isAdmin ? (
            <Menu.Item asChild className={ITEM}>
              <a href={SETTINGS_HREF}>
                <Settings className="h-4 w-4 text-ink-2" aria-hidden="true" />
                Settings
              </a>
            </Menu.Item>
          ) : null}
          <Menu.Item asChild className={ITEM}>
            <a href={SIGN_OUT_HREF}>
              <LogOut className="h-4 w-4 text-ink-2" aria-hidden="true" />
              Sign out
            </a>
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
