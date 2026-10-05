"use client";

import { m } from "motion/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { rise } from "@/lib/motion";

/** Each page fades and rises into place when the route changes. */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <m.div key={pathname} variants={rise} initial="hidden" animate="shown">
      {children}
    </m.div>
  );
}
