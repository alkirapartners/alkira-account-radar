import { fill } from "@/lib/brief-doc-copy";
import type { DocReference } from "@/lib/brief-types";
import { cn } from "@/lib/cn";

interface SourceChipsProps {
  /** Reference numbers the line cites. */
  sources: readonly number[];
  references: readonly DocReference[];
  /** "Source {n}", in the brief's language. */
  label: string;
  className?: string;
}

/** The anchor a source chip jumps to, and the id its reference row carries. */
export function referenceAnchor(number: number): string {
  return `ref-${number}`;
}

const CHIP =
  "num relative inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-sunken px-1.5 " +
  "text-[11px] font-medium leading-none text-ink-2";

/**
 * One small numbered chip per source, each jumping to its row in the
 * references. The chip is 22px tall; its ::after pad brings the touch target to 44px.
 */
export function SourceChips({ sources, references, label, className }: SourceChipsProps) {
  if (sources.length === 0) return null;

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      {sources.map((number) => {
        const reference = references.find((item) => item.n === number);
        if (!reference) {
          return (
            <span key={number} className={CHIP}>
              {number}
            </span>
          );
        }
        return (
          <a
            key={number}
            href={`#${referenceAnchor(number)}`}
            title={reference.title}
            aria-label={`${fill(label, { n: number })}: ${reference.title}`}
            className={cn(
              CHIP,
              "transition-[background-color,color,transform] duration-fast ease-out",
              "after:absolute after:-inset-x-0.5 after:-inset-y-[11px] after:content-['']",
              "hover:bg-accent hover:text-white active:scale-90",
            )}
          >
            {number}
          </a>
        );
      })}
    </span>
  );
}
