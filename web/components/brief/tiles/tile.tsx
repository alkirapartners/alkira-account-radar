"use client";

import { m } from "motion/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { rise } from "@/lib/motion";

interface TileProps {
  label?: string;
  children: ReactNode;
  className?: string;
  /** Heading id, when the tile needs a custom heading instead of the micro-label. */
  labelledBy?: string;
}

/** One cell of the brief's bento grid. Arrives with the grid's stagger. */
export function Tile({ label, children, className, labelledBy }: TileProps) {
  return (
    <m.section variants={rise} aria-labelledby={labelledBy} className={cn("card p-6 sm:p-7", className)}>
      {label ? <h2 className="micro-label">{label}</h2> : null}
      {children}
    </m.section>
  );
}
