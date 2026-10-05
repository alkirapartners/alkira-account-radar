"use client";

import { m } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";
import { SPRING_PILL } from "@/lib/motion";

const TOOLS = [
  { href: "/", label: "Brief Generator", short: "Briefs" },
  { href: "/radar", label: "Account Radar", short: "Radar" },
] as const;

type ToolHref = (typeof TOOLS)[number]["href"];

/** Which tool a path belongs to: everything under /radar is the radar, the rest is briefs. */
export function activeTool(pathname: string): ToolHref {
  return pathname === "/radar" || pathname.startsWith("/radar/") ? "/radar" : "/";
}

export function ToolTabs() {
  const active = activeTool(usePathname());

  return (
    <nav aria-label="Tools" className="inline-flex rounded-full bg-sunken p-1">
      {TOOLS.map((tool) => {
        const isActive = tool.href === active;
        return (
          <Link
            key={tool.href}
            href={tool.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative flex h-9 items-center rounded-full px-3.5 text-sm font-medium transition-colors duration-fast ease-out sm:px-4",
              isActive ? "text-white" : "text-ink-2 hover:text-ink",
            )}
          >
            {isActive ? (
              <m.span
                layoutId="tool-tab-pill"
                transition={SPRING_PILL}
                className="absolute inset-0 rounded-full bg-ink shadow-sm"
                aria-hidden="true"
              />
            ) : null}
            <span className="relative sm:hidden">{tool.short}</span>
            <span className="relative hidden sm:inline">{tool.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
