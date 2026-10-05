"use client";

import { Cloud, Layers, Network, Server, type LucideIcon } from "lucide-react";

import type { BriefInfra } from "@/lib/brief-types";

import { Tile } from "./tile";

interface InfraTilesProps {
  infra: BriefInfra;
  labels: Record<string, string>;
}

const CELLS: ReadonlyArray<{ key: keyof BriefInfra; labelKey: string; fallback: string; icon: LucideIcon }> = [
  { key: "cloudPlatforms", labelKey: "cloud_platforms", fallback: "Cloud Platforms", icon: Cloud },
  { key: "onPrem", labelKey: "on_prem", fallback: "On-Prem / Hybrid", icon: Server },
  { key: "deployment", labelKey: "deployment", fallback: "Deployment Model", icon: Layers },
  { key: "complexity", labelKey: "complexity", fallback: "Resulting Complexity", icon: Network },
];

export function hasInfra(infra: BriefInfra): boolean {
  return CELLS.some((cell) => infra[cell.key].trim() !== "");
}

/** The four infrastructure facts, as a 2×2 block inside the bento. */
export function InfraTiles({ infra, labels }: InfraTilesProps) {
  return (
    <div className="col-span-full grid gap-4 sm:grid-cols-2 lg:col-span-7">
      {CELLS.map((cell) => (
        <Tile key={cell.key}>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-accent/10 text-accent" aria-hidden="true">
              <cell.icon className="h-[18px] w-[18px]" />
            </span>
            <h2 className="micro-label">{labels[cell.labelKey] ?? cell.fallback}</h2>
          </div>
          <p className="mt-4 text-[15px] leading-relaxed text-ink">
            {infra[cell.key] || <span className="text-ink-2">Not found in the research.</span>}
          </p>
        </Tile>
      ))}
    </div>
  );
}
