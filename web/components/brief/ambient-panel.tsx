import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

interface AmbientPanelProps {
  children: ReactNode;
  className?: string;
  /** A calmer glow for secondary panels (the conversation starters tile). */
  quiet?: boolean;
}

/**
 * The one dark surface: near-black with a slow-drifting Alkira-blue glow and a
 * faint dot grid. The glow is a pre-blurred layer moved by transform only.
 */
export function AmbientPanel({ children, className, quiet = false }: AmbientPanelProps) {
  return (
    <div className={cn("on-ambient relative isolate overflow-hidden rounded-[28px] bg-ambient text-on-ambient shadow-ambient", className)}>
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -inset-[25%] -z-10 animate-[glow-drift_16s_ease-in-out_infinite] blur-3xl will-change-transform",
          quiet ? "opacity-45" : "opacity-80",
        )}
        style={{
          background:
            "radial-gradient(38% 46% at 28% 30%, rgb(var(--accent-rgb) / 0.62), transparent 70%)," +
            "radial-gradient(32% 40% at 78% 68%, rgb(var(--accent-soft-rgb) / 0.26), transparent 72%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          backgroundImage: "radial-gradient(rgb(255 255 255 / 0.09) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          maskImage: "linear-gradient(to bottom right, black, transparent 72%)",
          WebkitMaskImage: "linear-gradient(to bottom right, black, transparent 72%)",
        }}
      />
      {/* A hairline highlight along the top edge gives the panel a lit, glassy rim. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/10" />
      {children}
    </div>
  );
}
