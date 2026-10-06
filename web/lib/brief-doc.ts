// Readers for a brief document (format 2). Pure functions: no React, and no
// wording of their own beyond what the API's label table supplies.

import type { BriefDetail, BriefDoc, DocEvidenceLine, DocReference, DocStory } from "./brief-types";

const DOC_FORMAT = 2;
const OBJECT_PARTS = ["company", "stats", "fit", "snapshot"] as const;
const LIST_PARTS = ["angles", "people", "questions", "unconfirmed", "raiseScore", "references"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The document a response carries, or null when it has none or one this page
 * cannot lay out. The page then shows the legacy fields, which every response has.
 */
export function readDoc(brief: BriefDetail): BriefDoc | null {
  const doc: unknown = brief.doc;
  if (!isRecord(doc) || doc.format !== DOC_FORMAT) return null;
  const isWhole = OBJECT_PARTS.every((part) => isRecord(doc[part])) && LIST_PARTS.every((part) => Array.isArray(doc[part]));
  return isWhole ? (doc as unknown as BriefDoc) : null;
}

// ── Dates ────────────────────────────────────────────────────────────────────

const STORED_DATE = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/;
const MONTHS_IN_YEAR = 12;
// Month names as they are abbreviated inside a sentence; the API's i18n.SHORT_MONTHS.
const SHORT_MONTHS: Record<string, readonly string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
};

/** A stored date (YYYY, YYYY-MM or YYYY-MM-DD) as people write it: "28 Jul 2026". Anything else gives "". */
export function readableDate(stored: string, language: string): string {
  const match = STORED_DATE.exec(stored.trim());
  if (!match) return "";
  const [, year, monthText, dayText] = match;
  const month = Number(monthText ?? 0);
  if (month > MONTHS_IN_YEAR) return "";
  if (month === 0) return year;
  const name = (SHORT_MONTHS[language] ?? SHORT_MONTHS.en)[month - 1];
  const day = Number(dayText ?? 0);
  return day ? `${day} ${name} ${year}` : `${name} ${year}`;
}

/** How a fact is dated: by its source, by a posting seen open on a day, or not at all. */
export type DateKind = "dated" | "open" | "undated";

export interface DateState {
  kind: DateKind;
  /** Readable date. Empty when undated. */
  date: string;
}

const UNDATED: DateState = { kind: "undated", date: "" };

export function evidenceDate(
  line: Pick<DocEvidenceLine, "date" | "sources">,
  references: readonly DocReference[],
  language: string,
): DateState {
  const date = readableDate(line.date, language);
  if (!date) return UNDATED;
  // "Open" only when the line's date is the day one of its own sources was seen open.
  const isOpen = references.some((ref) => ref.openPosting && ref.date === line.date && line.sources.includes(ref.n));
  return { kind: isOpen ? "open" : "dated", date };
}

export function referenceDate(reference: DocReference, language: string): DateState {
  const date = readableDate(reference.date, language);
  if (!date) return UNDATED;
  return { kind: reference.openPosting ? "open" : "dated", date };
}

const DEFAULT_OPEN_POSTING = "open posting, seen {date}";
const DEFAULT_UNDATED = "source undated";
const DATE_SLOT = "{date}";

export function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** What the page prints for a date state, in the brief's language. */
export function dateLabel(state: DateState, labels: Record<string, string>): string {
  if (state.kind === "open") {
    return sentenceCase((labels.open_posting_seen ?? DEFAULT_OPEN_POSTING).replace(DATE_SLOT, state.date));
  }
  if (state.kind === "undated") return sentenceCase(labels.undated ?? DEFAULT_UNDATED);
  return state.date;
}

// ── Proof ────────────────────────────────────────────────────────────────────

// The story id the API gives a knowledge-base figure (proof_points.METRIC).
const METRIC_STORY_ID = "metric";

/** True for a figure standing in where no customer story fits the angle. */
export function isProofPoint(story: DocStory): boolean {
  return story.id === METRIC_STORY_ID;
}

const NAME_SEPARATOR = ": ";
// "80%", "40-60%", "Up to 1650%", then whatever follows it.
const FIGURE = /^((?:up to |about |over )?\d[\d.,]*(?:\s?[-–]\s?\d[\d.,]*)?\s?(?:%|x|×)?\+?)\s*(.*)$/i;
const TRAILING_STOP = /[.,]$/;

export interface Metric {
  name: string;
  figure: string;
  /** What follows the figure, or the whole result when it has no figure. */
  rest: string;
}

/** "Firewall reduction: 73% (up to 82% in some accounts)." as a name, a figure and the rest. */
export function splitMetric(result: string): Metric {
  const text = result.trim();
  const whole: Metric = { name: "", figure: "", rest: text };
  const colon = text.indexOf(NAME_SEPARATOR);
  if (colon === -1) return whole;
  const match = FIGURE.exec(text.slice(colon + NAME_SEPARATOR.length).replace(TRAILING_STOP, ""));
  if (!match) return whole;
  return { name: text.slice(0, colon).trim(), figure: match[1].trim().replace(TRAILING_STOP, ""), rest: match[2].trim() };
}

const QUALIFIED_NAME = /^(.+?)\s*\(([^()]+)\)$/;

/** "A software company (Nemertes study)" as who it is and where the story comes from. */
export function splitCustomer(customer: string): { name: string; qualifier: string } {
  const text = customer.trim();
  const match = QUALIFIED_NAME.exec(text);
  return match ? { name: match[1], qualifier: match[2] } : { name: text, qualifier: "" };
}

export interface TextPart {
  text: string;
  strong: boolean;
}

const NUMBER = String.raw`\d+(?:,\d{3})*(?:\.\d+)?`;
const NUMBER_WORDS = "one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve";
const TIME_UNITS = "minutes?|hours?|days?|weeks?|months?|years?";
// A length of time ("three weeks", "2 days"), or a figure with its sign ("1,400", "1650%", "99%+", "60-88%").
const NUMBERS = new RegExp(
  String.raw`\b(?:${NUMBER_WORDS}|${NUMBER}) (?:${TIME_UNITS})\b|${NUMBER}(?:[-–]${NUMBER})?(?:%\+?|\+|x\b)?`,
  "gi",
);

/** A result split around its numbers, so the page can set them heavier than the words. */
export function emphasiseNumbers(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let end = 0;
  for (const match of text.matchAll(NUMBERS)) {
    const start = match.index ?? 0;
    if (start > end) parts.push({ text: text.slice(end, start), strong: false });
    parts.push({ text: match[0], strong: true });
    end = start + match[0].length;
  }
  if (end < text.length) parts.push({ text: text.slice(end), strong: false });
  return parts;
}

// ── References ───────────────────────────────────────────────────────────────

const WEB_ADDRESS = /^https?:\/\//i;
const REGEXP_SPECIALS = /[.*+?^${}()|[\]\\]/g;

/** Only web addresses are ever linked: the document is written from third-party pages. */
export function isWebAddress(url: string): boolean {
  return WEB_ADDRESS.test(url.trim());
}

/** An address as a reader wants it: no scheme, no "www.", no bare trailing slash. */
export function displayUrl(url: string): string {
  if (!isWebAddress(url)) return url;
  try {
    const { hostname, pathname, search } = new URL(url);
    return `${hostname.replace(/^www\./, "")}${pathname === "/" ? "" : pathname}${search}`;
  } catch {
    return url;
  }
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * A reference's title without the "(open posting, seen 2026-10-06)" the API
 * appends to it. The row shows that as its date label, so it is not said twice.
 */
export function referenceTitle(reference: DocReference, labels: Record<string, string>): string {
  if (!reference.openPosting) return reference.title;
  const lead = (labels.open_posting_seen ?? DEFAULT_OPEN_POSTING).split(DATE_SLOT)[0].trim();
  const note = new RegExp(String.raw`\s*\(${lead.replace(REGEXP_SPECIALS, "\\$&")}[^)]*\)\s*$`, "i");
  return reference.title.replace(note, "").trim() || reference.title;
}

// ── Layout ───────────────────────────────────────────────────────────────────

// The end of a sentence: a stop, then space, then a capital or an opening mark.
const SENTENCE_END = /[.!?]\s+(?=[A-ZÁÉÍÓÚÑ¿¡"“])/;

/** The lead's first sentence (what to open with) and whatever follows it (whom to call). */
export function splitLead(lead: string): { first: string; rest: string } {
  const text = lead.trim();
  const end = SENTENCE_END.exec(text);
  if (!end) return { first: text, rest: "" };
  return { first: text.slice(0, end.index + 1), rest: text.slice(end.index + end[0].length) };
}
