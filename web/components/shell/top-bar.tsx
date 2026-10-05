"use client";

import Link from "next/link";

import { useScrolledPast } from "@/hooks/use-scrolled";
import { cn } from "@/lib/cn";

import { ToolTabs } from "./tool-tabs";
import { UserMenu } from "./user-menu";

export function TopBar() {
  const [sentinel, scrolled] = useScrolledPast<HTMLDivElement>();

  return (
    <>
      {/* Leaves the viewport as soon as the page scrolls; drives the bar's border. */}
      <div ref={sentinel} aria-hidden="true" className="absolute left-0 top-0 h-px w-px" />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to content
      </a>
      <header
        className={cn(
          "sticky top-0 z-30 border-b bg-canvas/80 backdrop-blur-xl transition-[border-color,box-shadow] duration-base ease-out",
          scrolled ? "border-line shadow-[0_1px_0_rgb(255_255_255/0.6)_inset]" : "border-transparent",
        )}
      >
        <div className="page flex h-[var(--bar-height)] items-center justify-between gap-3">
          <Link href="/" aria-label="Alkira partner tools, home" className="flex shrink-0 items-center rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element -- a small local SVG; next/image adds nothing */}
            <img src="/alkira-wordmark.svg" alt="" width={88} height={30} className="h-[26px] w-auto sm:h-[30px]" />
          </Link>
          <ToolTabs />
          <UserMenu />
        </div>
      </header>
    </>
  );
}
