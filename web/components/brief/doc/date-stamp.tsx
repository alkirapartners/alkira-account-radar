import { Calendar, CalendarOff, Radio, type LucideIcon } from "lucide-react";

import { dateLabel, type DateKind, type DateState } from "@/lib/brief-doc";
import { cn } from "@/lib/cn";

interface DateStampProps {
  state: DateState;
  labels: Record<string, string>;
  /** Off where something else already marks the line, such as a timeline dot. */
  icon?: boolean;
  className?: string;
}

/** Text colour for each date state. The words carry the meaning; colour only repeats it. */
export const DATE_TONE: Record<DateKind, string> = {
  dated: "text-ink-2",
  open: "text-positive",
  undated: "text-warning",
};

const ICON: Record<DateKind, LucideIcon> = {
  dated: Calendar,
  open: Radio,
  undated: CalendarOff,
};

/** When a fact's source is dated: "28 Jul 2026", "Open posting, seen 6 Oct 2026" or "Source undated". */
export function DateStamp({ state, labels, icon = true, className }: DateStampProps) {
  const Icon = ICON[state.kind];

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", DATE_TONE[state.kind], className)}>
      {icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
      {dateLabel(state, labels)}
    </span>
  );
}
