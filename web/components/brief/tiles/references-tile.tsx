"use client";

import { ArrowUpRight } from "lucide-react";

import { Markdown } from "@/components/ui/markdown";
import { parseReferences } from "@/lib/brief-content";

import { Tile } from "./tile";

interface ReferencesTileProps {
  label: string;
  referencesMd: string;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function ReferencesTile({ label, referencesMd }: ReferencesTileProps) {
  const { references, rest } = parseReferences(referencesMd);

  return (
    <Tile label={label} className="col-span-full bg-transparent shadow-none">
      {references.length > 0 ? (
        <ol className="mt-4 grid gap-x-8 sm:grid-cols-2">
          {references.map((reference) => (
            <li key={reference.index} className="border-b border-line">
              <a
                href={reference.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3.5 py-3.5 text-sm"
              >
                <span className="num text-xs text-ink-2">{reference.index.padStart(2, "0")}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink transition-colors duration-fast group-hover:text-accent">
                    {reference.title}
                  </span>
                  <span className="block truncate text-[13px] text-ink-2">{hostOf(reference.url)}</span>
                </span>
                <ArrowUpRight
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-ink-3 transition-[transform,color] duration-fast ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
                />
              </a>
            </li>
          ))}
        </ol>
      ) : null}
      {rest ? <Markdown className="mt-4 text-sm leading-relaxed text-ink-2">{rest}</Markdown> : null}
    </Tile>
  );
}
