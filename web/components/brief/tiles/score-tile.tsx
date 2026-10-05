"use client";

import { CountUp } from "@/components/ui/count-up";
import { Pill, type PillTone } from "@/components/ui/pill";
import { ScoreMeter } from "@/components/ui/score-meter";
import { FIT_LABEL, fitTier, type FitTier } from "@/lib/score";

import { Tile } from "./tile";

interface ScoreTileProps {
  label: string;
  score: number;
  rationale: string;
}

const FIT_SCALE = 5;
/** Starts the count once the tile itself has arrived. */
const COUNT_DELAY_MS = 220;

const TIER_TONE: Record<FitTier, PillTone> = {
  strong: "accent",
  moderate: "warning",
  weak: "neutral",
  none: "neutral",
};

export function ScoreTile({ label, score, rationale }: ScoreTileProps) {
  const tier = fitTier(score, FIT_SCALE);

  return (
    <Tile label={label} className="col-span-full">
      <div className="mt-5 grid gap-7 md:grid-cols-[auto_minmax(0,1fr)] md:items-center md:gap-12">
        <div>
          <p className="flex items-baseline gap-2 font-semibold leading-none tracking-display">
            {tier === "none" ? (
              <span className="text-[72px] text-ink-3 sm:text-[88px]">&ndash;</span>
            ) : (
              <CountUp value={score} durationMs={900} delayMs={COUNT_DELAY_MS} className="text-[72px] sm:text-[88px]" />
            )}
            <span className="text-2xl font-medium tracking-normal text-ink-2">/ {FIT_SCALE}</span>
          </p>
          <div className="mt-5 flex items-center gap-4">
            <ScoreMeter score={score} scale={FIT_SCALE} size="lg" animate delay={COUNT_DELAY_MS / 1000} subject={label} />
            <Pill tone={TIER_TONE[tier]}>{FIT_LABEL[tier]}</Pill>
          </div>
        </div>
        {rationale ? (
          <p className="max-w-[62ch] text-[17px] leading-[1.65] text-ink sm:text-lg sm:leading-[1.65]">{rationale}</p>
        ) : (
          <p className="max-w-[62ch] text-[15px] leading-relaxed text-ink-2">
            This brief didn&rsquo;t come back with a fit score. Update it to research the company again.
          </p>
        )}
      </div>
    </Tile>
  );
}
