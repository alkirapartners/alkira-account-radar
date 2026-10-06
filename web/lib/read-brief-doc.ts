// Reads the brief document a response carries into the shape the page lays out.
//
// The document comes from another service and is written by a model, so nothing
// in it is trusted to be there or to be the right type. Every value is read
// through a function that gives a safe one back: text that is missing or is
// not text reads as "", a list as [], a number as 0. What cannot be used at
// all (an angle that is not an object, a question with no question) is
// dropped. The components can then use every field without checking it.

import type {
  BriefDetail,
  BriefDoc,
  DealStatus,
  DocAngle,
  DocCompany,
  DocEvidenceLine,
  DocFit,
  DocPerson,
  DocQuestion,
  DocReference,
  DocResearch,
  DocSnapshot,
  DocSnapshotLine,
  DocStats,
  DocStory,
  SourceType,
} from "./brief-types";

type Raw = Record<string, unknown>;

const DOC_FORMAT = 2;
const FIRST_VERSION = 1;
const MAX_SCORE = 5;
// A document missing one of these whole is not one this page knows; the legacy fields are shown instead.
const OBJECT_PARTS = ["company", "stats", "fit", "snapshot"] as const;
const LIST_PARTS = ["angles", "people", "questions", "unconfirmed", "raiseScore", "references"] as const;
const DEAL_STATUSES: readonly DealStatus[] = ["none", "pending", "completed"];
const SOURCE_TYPES: readonly SourceType[] = ["first_hand", "second_hand", "last_resort"];
// What the API itself reads an untyped source as (brief_doc.ADDED_FIELDS).
const DEFAULT_SOURCE_TYPE: SourceType = "second_hand";

function isRecord(value: unknown): value is Raw {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Text as written; a number as its digits; anything else as nothing. */
function text(value: unknown): string {
  if (typeof value === "string") return value;
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

const isFilled = (value: string): boolean => value.trim() !== "";

/** A number, also when it arrives as digits in a string. Null for anything else. */
function numeric(value: unknown): number | null {
  const number = typeof value === "string" && isFilled(value) ? Number(value) : value;
  return typeof number === "number" && Number.isFinite(number) ? number : null;
}

/** A count: a whole number, never negative. */
function count(value: unknown): number {
  return Math.max(0, Math.trunc(numeric(value) ?? 0));
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/** The objects in a list. Anything in it that is not an object is dropped. */
function records(value: unknown): Raw[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

/** The lines of text in a list. Anything that is not text, or is blank, is dropped. */
function lines(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => (typeof item === "string" ? item : "")).filter(isFilled) : [];
}

/** Reference numbers: positive whole numbers. Anything else is dropped. */
function sourceNumbers(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.map(numeric).filter((number): number is number => number !== null && Number.isInteger(number) && number > 0);
}

function readCompany(raw: Raw): DocCompany {
  return {
    name: text(raw.name),
    legalName: text(raw.legalName),
    ticker: text(raw.ticker),
    website: text(raw.website),
    identityNote: text(raw.identityNote),
  };
}

function readStats(raw: Raw): DocStats {
  return {
    hq: text(raw.hq),
    revenue: text(raw.revenue),
    employees: text(raw.employees),
    industry: text(raw.industry),
    ownership: text(raw.ownership),
    cloudNetwork: text(raw.cloudNetwork),
  };
}

function readFit(raw: Raw): DocFit {
  // 0 is "not scored": the page says so instead of showing a number it was not given.
  const score = Math.min(MAX_SCORE, Math.max(0, Math.round(numeric(raw.score) ?? 0)));
  return { score, verdict: text(raw.verdict), lead: text(raw.lead) };
}

function readEvidence(value: unknown): DocEvidenceLine[] {
  return records(value)
    .map((line) => ({ text: text(line.text), date: text(line.date), sources: sourceNumbers(line.sources) }))
    .filter((line) => isFilled(line.text));
}

function readStory(value: unknown): DocStory {
  const raw = isRecord(value) ? value : {};
  return { id: text(raw.id), customer: text(raw.customer), result: text(raw.result) };
}

function readAngle(raw: Raw): DocAngle {
  return {
    title: text(raw.title),
    useCase: text(raw.useCase),
    evidence: readEvidence(raw.evidence),
    alkira: text(raw.alkira),
    story: readStory(raw.story),
    dealDate: text(raw.dealDate),
    dealStatus: oneOf(raw.dealStatus, DEAL_STATUSES, "none"),
    dealPendingQuote: text(raw.dealPendingQuote),
  };
}

/** An angle with nothing to say (no title, no evidence, no answer) is not shown as an empty card. */
function hasSubstance(angle: DocAngle): boolean {
  return isFilled(angle.title) || isFilled(angle.alkira) || angle.evidence.length > 0;
}

function readSnapshotLine(value: unknown): DocSnapshotLine {
  const raw = isRecord(value) ? value : {};
  return { text: text(raw.text), sources: sourceNumbers(raw.sources) };
}

function readSnapshot(raw: Raw): DocSnapshot {
  return {
    clouds: readSnapshotLine(raw.clouds),
    cloudConnectivity: readSnapshotLine(raw.cloudConnectivity),
    wan: readSnapshotLine(raw.wan),
    firewalls: readSnapshotLine(raw.firewalls),
    dataCenters: readSnapshotLine(raw.dataCenters),
    plantNetworks: readSnapshotLine(raw.plantNetworks),
  };
}

function readPeople(value: unknown): DocPerson[] {
  return records(value)
    .map((person) => ({ name: text(person.name), role: text(person.role), note: text(person.note), sources: sourceNumbers(person.sources) }))
    .filter((person) => isFilled(person.name) || isFilled(person.role));
}

function readQuestions(value: unknown): DocQuestion[] {
  return records(value)
    .map((item) => ({
      question: text(item.question),
      listenFor: text(item.listenFor),
      alkiraAngle: text(item.alkiraAngle),
      angle: count(item.angle),
    }))
    .filter((item) => isFilled(item.question));
}

function readReferences(value: unknown): DocReference[] {
  return records(value)
    .map((reference, index) => {
      const number = numeric(reference.n);
      return {
        // A reference with no usable number takes its place in the list, which is how the API numbers them.
        n: number !== null && Number.isInteger(number) && number > 0 ? number : index + 1,
        title: text(reference.title),
        url: text(reference.url),
        date: text(reference.date),
        sourceType: oneOf(reference.sourceType, SOURCE_TYPES, DEFAULT_SOURCE_TYPE),
        openPosting: reference.openPosting === true,
      };
    })
    .filter((reference) => isFilled(reference.title) || isFilled(reference.url));
}

function readResearch(value: unknown): DocResearch | null {
  if (!isRecord(value)) return null;
  return { searches: count(value.searches), pages: count(value.pages), seconds: count(value.seconds), stoppedBy: text(value.stoppedBy) };
}

function read(doc: unknown): BriefDoc | null {
  if (!isRecord(doc) || doc.format !== DOC_FORMAT) return null;
  const isWhole = OBJECT_PARTS.every((part) => isRecord(doc[part])) && LIST_PARTS.every((part) => Array.isArray(doc[part]));
  if (!isWhole) return null;

  // Only the fields named here are read, so a newer document's extra fields are ignored.
  return {
    company: readCompany(doc.company as Raw),
    stats: readStats(doc.stats as Raw),
    fit: readFit(doc.fit as Raw),
    angles: records(doc.angles).map(readAngle).filter(hasSubstance),
    snapshot: readSnapshot(doc.snapshot as Raw),
    people: readPeople(doc.people),
    questions: readQuestions(doc.questions),
    unconfirmed: lines(doc.unconfirmed),
    raiseScore: lines(doc.raiseScore),
    format: DOC_FORMAT,
    version: count(doc.version) || FIRST_VERSION,
    language: text(doc.language),
    generated: text(doc.generated),
    references: readReferences(doc.references),
    research: readResearch(doc.research),
  };
}

// One reading per document object: the page asks for it from several components on every render.
const READINGS = new WeakMap<object, BriefDoc | null>();

/**
 * The document a response carries, made safe to lay out, or null when it has
 * none or one this page does not know. The page then shows the legacy fields,
 * which every response has. Never throws.
 */
export function readDoc(brief: BriefDetail): BriefDoc | null {
  const raw: unknown = brief.doc;
  if (typeof raw !== "object" || raw === null) return null;
  if (!READINGS.has(raw)) READINGS.set(raw, read(raw));
  return READINGS.get(raw) ?? null;
}
