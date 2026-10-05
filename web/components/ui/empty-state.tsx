import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  /** A next step: a button or link. */
  action?: ReactNode;
  className?: string;
}

/** A designed stand-in for content that is missing, failed, or not found. */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-accent/10 text-accent" aria-hidden="true">
        {icon}
      </span>
      <h2 className="mt-5 text-lg font-semibold tracking-heading">{title}</h2>
      <p className="mt-1.5 max-w-sm text-[15px] leading-relaxed text-ink-2">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
