"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

interface CopyButtonProps {
  text: string;
  /** Spoken name, e.g. "Copy question 1". */
  label: string;
  tone?: "light" | "ambient";
  className?: string;
}

const CONFIRM_MS = 1500;

const TONES = {
  light: "text-ink-2 hover:bg-ink/5 hover:text-ink",
  ambient: "text-on-ambient-2 hover:bg-white/10 hover:text-on-ambient",
} as const;

export function CopyButton({ text, label, tone = "light", className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard access can be refused (permissions, insecure origin). The
      // text is still on the page to select by hand, so stay quiet.
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), CONFIRM_MS);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      className={cn(
        "relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-[background-color,color,transform] duration-fast ease-out active:scale-90",
        "after:absolute after:-inset-1 after:content-['']",
        TONES[tone],
        className,
      )}
    >
      <Copy
        aria-hidden="true"
        className={cn("absolute h-4 w-4 transition-[opacity,transform] duration-fast ease-out", copied && "scale-50 opacity-0")}
      />
      <Check
        aria-hidden="true"
        className={cn(
          "absolute h-4 w-4 transition-[opacity,transform] duration-fast ease-out",
          tone === "ambient" ? "text-accent-soft" : "text-positive",
          copied ? "scale-100 opacity-100" : "scale-50 opacity-0",
        )}
      />
      <span role="status" className="sr-only">
        {copied ? "Copied" : ""}
      </span>
    </button>
  );
}
