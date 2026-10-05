import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/cn";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string | null;
  tone?: "light" | "ambient";
  /** Rendered inside the field, before the text (an icon). */
  leading?: ReactNode;
  /** Rendered inside the field, after the text (a shortcut hint). */
  trailing?: ReactNode;
}

const FIELD: Record<NonNullable<TextFieldProps["tone"]>, string> = {
  light:
    "border-line-strong bg-surface text-ink placeholder:text-ink-2/80 hover:border-ink/25 " +
    "focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15",
  ambient:
    "border-white/15 bg-white/[0.07] text-on-ambient placeholder:text-on-ambient-2 hover:border-white/25 " +
    "focus-within:border-accent-soft focus-within:bg-white/10 focus-within:ring-4 focus-within:ring-accent-soft/20",
};

const LABEL: Record<NonNullable<TextFieldProps["tone"]>, string> = {
  light: "text-ink",
  ambient: "text-on-ambient",
};

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, tone = "light", leading, trailing, className, id, ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className={className}>
      <label htmlFor={inputId} className={cn("mb-2 block text-sm font-medium", LABEL[tone])}>
        {label}
      </label>
      <div
        className={cn(
          "flex h-[52px] items-center gap-3 rounded-inner border px-4 transition-[border-color,box-shadow,background-color] duration-fast ease-out",
          FIELD[tone],
          error && "border-negative focus-within:border-negative focus-within:ring-negative/15",
        )}
      >
        {leading}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
          // The wrapper draws the focus ring, so the input's own outline is redundant.
          className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-inherit [&::placeholder]:opacity-70"
          {...rest}
        />
        {trailing}
      </div>
      {error ? (
        <p id={errorId} role="alert" className={cn("mt-2 text-sm", tone === "ambient" ? "text-[#FDA4AF]" : "text-negative")}>
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className={cn("mt-2 text-sm", tone === "ambient" ? "text-on-ambient-2" : "text-ink-2")}>
          {hint}
        </p>
      ) : null}
    </div>
  );
});
