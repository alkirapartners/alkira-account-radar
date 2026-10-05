import { Pill } from "@/components/ui/pill";
import type { Summary } from "@/lib/row-state";

interface SummaryPillsProps {
  summary: Summary;
}

/** The batch at a glance: how many accounts landed in each band. */
export function SummaryPills({ summary }: SummaryPillsProps) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Results by band">
      <li>
        <Pill tone="accent">
          <span className="num">{summary.hot}</span> hot
        </Pill>
      </li>
      <li>
        <Pill tone="warning">
          <span className="num">{summary.warm}</span> warm
        </Pill>
      </li>
      <li>
        <Pill tone="neutral">
          <span className="num">{summary.cool}</span> skip
        </Pill>
      </li>
      {summary.unscored > 0 ? (
        <li>
          <Pill tone="neutral">
            <span className="num">{summary.unscored}</span> not scored
          </Pill>
        </li>
      ) : null}
      {summary.error > 0 ? (
        <li>
          <Pill tone="negative">
            <span className="num">{summary.error}</span> errored
          </Pill>
        </li>
      ) : null}
    </ul>
  );
}
