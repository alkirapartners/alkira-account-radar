"use client";

import { useActiveSection } from "@/hooks/use-active-section";
import type { DocSection } from "@/lib/brief-sections";
import { cn } from "@/lib/cn";

interface SectionLinksProps {
  sections: readonly DocSection[];
  /** The id of the section being read, if any. */
  active: string | null;
  /** What the nav is called, for assistive technology. */
  label: string;
}

const MIN_SECTIONS = 2;
const LINK = "inline-flex h-8 items-center whitespace-nowrap rounded-full px-3 text-[13px] font-medium transition-colors duration-fast ease-out";

/** The jump links themselves. The current section is a filled pill and is marked for assistive technology. */
export function SectionLinks({ sections, active, label }: SectionLinksProps) {
  if (sections.length < MIN_SECTIONS) return null;

  return (
    <nav aria-label={label} className="hidden shrink-0 lg:block">
      <ul className="flex items-center gap-0.5">
        {sections.map((section) => {
          const isCurrent = section.id === active;
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                aria-current={isCurrent ? "location" : undefined}
                className={cn(LINK, isCurrent ? "bg-ink/[0.08] text-ink" : "text-ink-2 hover:bg-ink/5 hover:text-ink")}
              >
                {section.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Jump links to the sections of a long brief, for wide screens. It sits in the
 * pinned bar, so it is in reach wherever the reader is, and shows which
 * section they are in.
 */
export function SectionNav({ sections, label }: Omit<SectionLinksProps, "active">) {
  const active = useActiveSection(sections.map((section) => section.id));
  return <SectionLinks sections={sections} active={active} label={label} />;
}
