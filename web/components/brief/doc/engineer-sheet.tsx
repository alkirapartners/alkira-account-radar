"use client";

import { BrickWall, Cable, Cloudy, Factory, Server, Waypoints, type LucideIcon } from "lucide-react";

import type { DocCopy } from "@/lib/brief-doc-copy";
import { SECTION_ID } from "@/lib/brief-sections";
import type { DocReference, DocSnapshot } from "@/lib/brief-types";
import { cn } from "@/lib/cn";
import { tokenizeTech } from "@/lib/tech-terms";

import { Tile } from "../tiles/tile";
import { SourceChips } from "./source-chips";

interface EngineerSheetProps {
  snapshot: DocSnapshot;
  references: readonly DocReference[];
  labels: Record<string, string>;
  copy: DocCopy;
  /** Two columns of rows, for when the sheet has the whole row to itself. */
  wide?: boolean;
  className?: string;
}

const HEADING_ID = "engineer-heading";

const ROWS: ReadonlyArray<{ key: keyof DocSnapshot; labelKey: string; fallback: string; icon: LucideIcon }> = [
  { key: "clouds", labelKey: "snap_clouds", fallback: "Clouds", icon: Cloudy },
  { key: "cloudConnectivity", labelKey: "snap_cloud_connectivity", fallback: "Cloud connectivity", icon: Cable },
  { key: "wan", labelKey: "snap_wan", fallback: "WAN", icon: Waypoints },
  { key: "firewalls", labelKey: "snap_firewalls", fallback: "Firewalls", icon: BrickWall },
  { key: "dataCenters", labelKey: "snap_data_centers", fallback: "Data centers", icon: Server },
  { key: "plantNetworks", labelKey: "snap_plant_networks", fallback: "Plant networks", icon: Factory },
];

/** A snapshot line with its products, vendors and protocols set in mono, so an engineer's eye lands on them. */
function TechText({ text }: { text: string }) {
  return (
    <>
      {tokenizeTech(text).map((token, index) =>
        token.term ? (
          <span key={index} data-term="" className="rounded-[5px] bg-ink/[0.055] box-decoration-clone px-1 py-px font-mono text-[0.86em] font-medium text-ink">
            {token.text}
          </span>
        ) : (
          token.text
        ),
      )}
    </>
  );
}

/**
 * The technical snapshot as a spec sheet. Every line is always listed: one the
 * research did not find is muted and says so, because a known gap is useful too.
 */
export function EngineerSheet({ snapshot, references, labels, copy, wide = false, className }: EngineerSheetProps) {
  const notFound = labels.not_found_public ?? "Not found in public sources.";

  return (
    <Tile id={SECTION_ID.engineer} labelledBy={HEADING_ID} className={cn("scroll-mt-16", className)}>
      <p className="micro-label">{labels.technical_snapshot ?? "Technical snapshot"}</p>
      <h2 id={HEADING_ID} className="mt-2.5 text-xl font-semibold tracking-heading">
        {copy.forEngineer}
      </h2>

      <dl className={cn("mt-5 border-t border-line", wide ? "sm:grid sm:grid-cols-2 sm:gap-x-10" : "divide-y divide-line")}>
        {ROWS.map((row) => {
          const line = snapshot[row.key];
          const text = line?.text.trim() ?? "";
          const isFound = text !== "";
          return (
            // A description list may hold only terms and descriptions, so the icon lives inside the
            // term, set out to its left in the padding the row leaves for it.
            <div key={row.key} className={cn("relative py-4 pl-[46px]", wide ? "border-b border-line" : "last:pb-0")}>
              <dt className="micro-label pt-[3px]">
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute left-0 top-4 flex h-8 w-8 items-center justify-center rounded-[10px]",
                    isFound ? "bg-accent/10 text-accent" : "bg-sunken text-ink-3",
                  )}
                >
                  <row.icon className="h-4 w-4" />
                </span>
                {labels[row.labelKey] ?? row.fallback}
              </dt>
              {isFound ? (
                <dd className="mt-2 text-[15px] leading-[1.7] text-ink [overflow-wrap:anywhere]">
                  <TechText text={text} />{" "}
                  <SourceChips sources={line.sources} references={references} label={copy.source} className="align-[-0.25em]" />
                </dd>
              ) : (
                <dd className="mt-2 text-[15px] leading-relaxed text-ink-2">{notFound}</dd>
              )}
            </div>
          );
        })}
      </dl>
    </Tile>
  );
}
