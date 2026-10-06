"use client";

import { UserRound } from "lucide-react";

import type { DocCopy } from "@/lib/brief-doc-copy";
import type { DocPerson, DocReference } from "@/lib/brief-types";
import { cn } from "@/lib/cn";

import { Tile } from "../tiles/tile";
import { SourceChips } from "./source-chips";

interface PeopleCardProps {
  people: readonly DocPerson[];
  references: readonly DocReference[];
  labels: Record<string, string>;
  copy: DocCopy;
}

const HEADING_ID = "people-heading";
const MAX_INITIALS = 2;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, MAX_INITIALS)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

/**
 * Who to call, as tall rows: who, why them, and the source. A person a source
 * names gets their initials; a role nobody is named for gets a dashed outline,
 * which reads as "still to be found".
 */
export function PeopleCard({ people, references, labels, copy }: PeopleCardProps) {
  return (
    <Tile labelledBy={HEADING_ID}>
      <h2 id={HEADING_ID} className="text-xl font-semibold tracking-heading">
        {labels.who_to_talk_to ?? "Who to talk to"}
      </h2>

      <ul className="mt-5 divide-y divide-line border-t border-line">
        {people.map((person, index) => {
          const name = person.name.trim();
          const note = person.note.trim();
          return (
            <li
              key={index}
              className="grid gap-x-8 gap-y-2.5 py-4 last:pb-0 md:min-h-[68px] md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-center"
            >
              <div className="flex items-center gap-3.5">
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold",
                    name ? "bg-accent/10 text-accent" : "border-[1.5px] border-dashed border-ink-3 text-ink-2",
                  )}
                >
                  {name ? initials(name) : <UserRound className="h-[18px] w-[18px]" />}
                </span>
                <div className="min-w-0">
                  {name ? <p className="text-base font-semibold leading-snug text-ink">{name}</p> : null}
                  <p className={cn("leading-snug", name ? "mt-0.5 text-sm text-ink-2" : "text-[15px] font-medium text-ink")}>
                    {person.role}
                  </p>
                </div>
              </div>
              {note || person.sources.length > 0 ? (
                <p className="pl-[54px] text-sm leading-relaxed text-ink-2 md:pl-0">
                  {note}{" "}
                  <SourceChips sources={person.sources} references={references} label={copy.source} className="align-[-0.3em]" />
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Tile>
  );
}
