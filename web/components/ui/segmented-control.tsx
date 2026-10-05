"use client";

import { m } from "motion/react";
import { useId, useRef, type KeyboardEvent } from "react";

import { cn } from "@/lib/cn";
import { SPRING_PILL } from "@/lib/motion";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  /** Names the group for assistive technology. */
  label: string;
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  tone?: "light" | "ambient";
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
}

const TRACK = { light: "bg-sunken", ambient: "bg-white/10" } as const;
const ACTIVE_PILL = { light: "bg-ink shadow-sm", ambient: "bg-white shadow-sm" } as const;
const ACTIVE_TEXT = { light: "text-white", ambient: "text-ink" } as const;
const IDLE_TEXT = {
  light: "text-ink-2 hover:text-ink",
  ambient: "text-on-ambient-2 hover:text-on-ambient",
} as const;
const HEIGHT = { sm: "h-9 text-[13px]", md: "h-11 text-sm" } as const;

const NEXT_KEYS = ["ArrowRight", "ArrowDown"];
const PREVIOUS_KEYS = ["ArrowLeft", "ArrowUp"];

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  tone = "light",
  size = "md",
  disabled = false,
  className,
}: SegmentedControlProps<T>) {
  const pillId = useId();
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = NEXT_KEYS.includes(event.key) ? 1 : PREVIOUS_KEYS.includes(event.key) ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next].value);
    buttons.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      className={cn("inline-flex rounded-full p-1", TRACK[tone], disabled && "opacity-60", className)}
    >
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              buttons.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => move(event, index)}
            className={cn(
              "relative rounded-full px-4 font-medium transition-colors duration-fast ease-out",
              HEIGHT[size],
              // Track padding is 4px each side, so the button fills the remaining height.
              "h-auto min-h-0 self-stretch py-0",
              active ? ACTIVE_TEXT[tone] : IDLE_TEXT[tone],
            )}
          >
            {active ? (
              <m.span
                layoutId={pillId}
                transition={SPRING_PILL}
                className={cn("absolute inset-0 rounded-full", ACTIVE_PILL[tone])}
                aria-hidden="true"
              />
            ) : null}
            <span className={cn("relative flex items-center", size === "sm" ? "h-7" : "h-9")}>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
