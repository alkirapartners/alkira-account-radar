const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const EXACT_FORMAT = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

const plural = (count: number, unit: string) => `${count} ${unit}${count === 1 ? "" : "s"} ago`;

/** "5 minutes ago", "yesterday", then a plain date once it is more than a week old. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";

  const elapsed = now.getTime() - then.getTime();
  if (elapsed < MINUTE_MS) return "just now";
  if (elapsed < HOUR_MS) return plural(Math.floor(elapsed / MINUTE_MS), "minute");
  if (elapsed < DAY_MS) return plural(Math.floor(elapsed / HOUR_MS), "hour");
  if (elapsed < 2 * DAY_MS) return "yesterday";
  if (elapsed < WEEK_MS) return plural(Math.floor(elapsed / DAY_MS), "day");
  return DATE_FORMAT.format(then);
}

/** Full date and time in the viewer's own time zone, for a tooltip. */
export function exactTime(iso: string): string {
  const then = new Date(iso);
  return Number.isNaN(then.getTime()) ? "" : EXACT_FORMAT.format(then);
}
