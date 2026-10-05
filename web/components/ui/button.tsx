import { LoaderCircle } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "on-ambient";
export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Disables the button and shows a spinner without changing its width. */
  loading?: boolean;
  icon?: ReactNode;
}

const BASE =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium " +
  "transition-[transform,background-color,box-shadow,color,opacity] duration-fast ease-out " +
  "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_6px_18px_rgb(var(--accent-rgb)/0.3)] " +
    "hover:bg-accent-strong hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_10px_26px_rgb(var(--accent-rgb)/0.38)]",
  secondary: "border border-line-strong bg-surface text-ink shadow-sm hover:bg-sunken",
  ghost: "text-ink-2 hover:bg-ink/5 hover:text-ink",
  danger: "bg-negative text-white hover:bg-negative/90",
  "on-ambient": "border border-white/15 bg-white/10 text-on-ambient hover:bg-white/15",
};

// "sm" is 40px tall; the ::after pad brings its touch target to 48px.
const SIZES: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-sm after:absolute after:-inset-1 after:content-['']",
  md: "h-11 px-5 text-[15px]",
  lg: "h-[52px] px-7 text-base",
  // Square, icon-only. Separate sizes rather than a padding override, which Tailwind would not honour.
  icon: "h-11 w-11 shrink-0",
  "icon-sm": "h-10 w-10 shrink-0 after:absolute after:-inset-1 after:content-['']",
};

/** The same look for a link that should read as a button (a download, a route change). */
export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, icon, disabled, className, children, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      {...rest}
    >
      <span className={cn("inline-flex items-center gap-2", loading && "opacity-0")}>
        {icon}
        {children}
      </span>
      {loading ? (
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <LoaderCircle className="h-4 w-4 animate-spin" />
        </span>
      ) : null}
    </button>
  );
});
