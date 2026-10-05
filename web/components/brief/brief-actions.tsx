"use client";

import * as Menu from "@radix-ui/react-dropdown-menu";
import { Download, Ellipsis, RefreshCw, Trash2 } from "lucide-react";

import { Button, buttonClasses } from "@/components/ui/button";
import { pdfHref } from "@/lib/brief-api";
import { cn } from "@/lib/cn";

interface BriefActionsProps {
  briefId: string;
  /** True while an update is running: the brief is about to be replaced. */
  disabled: boolean;
  onUpdate: () => void;
  onDelete: () => void;
  /** Icon-sized controls for the pinned bar. */
  compact?: boolean;
}

export function BriefActions({ briefId, disabled, onUpdate, onDelete, compact = false }: BriefActionsProps) {
  const size = compact ? "sm" : "md";
  const iconSize = compact ? "icon-sm" : "icon";

  return (
    <div className={cn("flex items-center gap-2", compact ? "shrink-0" : "w-full flex-wrap sm:flex-nowrap lg:w-auto lg:shrink-0")}>
      {/* A plain link: the browser downloads it with the session cookie, and an
          expired session lands on sign-in instead of saving an HTML page. */}
      <a
        href={pdfHref(briefId)}
        aria-disabled={disabled || undefined}
        className={cn(buttonClasses("primary", size), !compact && "basis-full sm:basis-auto", disabled && "pointer-events-none opacity-50")}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Download PDF
      </a>
      <Button variant="secondary" size={size} onClick={onUpdate} disabled={disabled} className={compact ? "hidden md:inline-flex" : "flex-1 sm:flex-none"}>
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        Update brief
      </Button>
      <Menu.Root>
        <Menu.Trigger
          disabled={disabled}
          aria-label="More actions"
          className={buttonClasses("secondary", iconSize)}
        >
          <Ellipsis className="h-4 w-4" aria-hidden="true" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content
            align="end"
            sideOffset={8}
            className="z-50 min-w-[200px] origin-top-right rounded-2xl border border-line bg-surface p-1.5 shadow-lift data-[state=open]:animate-[menu-in_150ms_var(--ease-out)]"
          >
            {compact ? (
              <Menu.Item
                onSelect={onUpdate}
                className="flex h-11 cursor-pointer select-none items-center gap-3 rounded-[10px] px-3 text-sm text-ink outline-none transition-colors duration-fast data-[highlighted]:bg-ink/5 md:hidden"
              >
                <RefreshCw className="h-4 w-4 text-ink-2" aria-hidden="true" />
                Update brief
              </Menu.Item>
            ) : null}
            <Menu.Item
              onSelect={onDelete}
              className="flex h-11 cursor-pointer select-none items-center gap-3 rounded-[10px] px-3 text-sm text-negative outline-none transition-colors duration-fast data-[highlighted]:bg-negative-tint"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete brief
            </Menu.Item>
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}
