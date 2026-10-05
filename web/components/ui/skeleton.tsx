import { cn } from "@/lib/cn";

interface SkeletonProps {
  className?: string;
  tone?: "light" | "ambient";
}

/** A placeholder block with a passing shimmer. Size it with className. */
export function Skeleton({ className, tone = "light" }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative block overflow-hidden rounded-inner",
        tone === "light" ? "bg-ink/[0.06]" : "bg-white/10",
        className,
      )}
    >
      <span
        className={cn(
          "absolute inset-0 animate-[shimmer_1.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent to-transparent",
          tone === "light" ? "via-white/70" : "via-white/10",
        )}
      />
    </span>
  );
}
