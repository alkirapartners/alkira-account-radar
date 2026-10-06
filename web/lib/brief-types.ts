export type Language = "en" | "es";

export type BriefPhase = "init" | "research" | "analyze" | "compose";

export interface Me {
  email: string;
  isAdmin: boolean;
}

export interface BriefSummary {
  id: string;
  company: string;
  score: number;
  snippet: string;
  language: Language;
  createdAt: string;
}

export interface EntryPoint {
  heading: string;
  signal: string;
  solution: string;
  proof: string;
}

export interface BriefInfra {
  cloudPlatforms: string;
  onPrem: string;
  deployment: string;
  complexity: string;
}

export interface BriefDetail {
  id: string;
  company: string;
  statsLine: string;
  score: number;
  scoreRationale: string;
  infra: BriefInfra;
  signals: string[];
  entryPoints: EntryPoint[];
  startersMd: string;
  referencesMd: string;
  language: Language;
  /** Tile labels in the brief's own language, keyed as in the API's label table. */
  labels: Record<string, string>;
  createdAt: string;
  /** 2 for a brief stored as a document, 1 for legacy markdown. Absent from older API builds. */
  format?: number;
  /** The whole brief document. Null or absent for a legacy markdown brief. */
  doc?: BriefDoc | null;
}

// ── The brief document (format 2) as the API sends it: brief_doc.py, with camelCase keys ──

export type UseCase =
  | "multi_cloud"
  | "china_global"
  | "firewall_consolidation"
  | "m_and_a"
  | "network_modernization"
  | "site_rollout"
  | "partner_connectivity";

/** Whether an M&A angle's deal has yet to complete. "none" for every other use case. */
export type DealStatus = "none" | "pending" | "completed";

export type SourceType = "first_hand" | "second_hand" | "last_resort";

export interface DocCompany {
  name: string;
  legalName: string;
  ticker: string;
  website: string;
  /** Which company this is, when the typed name could have meant another. */
  identityNote: string;
}

/** Full values. The short forms for pills are in `BriefDetail.statsLine`. */
export interface DocStats {
  hq: string;
  revenue: string;
  employees: string;
  industry: string;
  ownership: string;
  cloudNetwork: string;
}

export interface DocFit {
  score: number;
  verdict: string;
  /** What to open with and whom to call. */
  lead: string;
}

export interface DocEvidenceLine {
  text: string;
  /** The source's date as YYYY, YYYY-MM or YYYY-MM-DD. Empty when the source gives none. */
  date: string;
  /** Reference numbers. */
  sources: number[];
}

export interface DocStory {
  /** "metric" marks a knowledge-base figure standing in where no customer story fits. */
  id: string;
  customer: string;
  result: string;
}

export interface DocAngle {
  title: string;
  /** A `UseCase`. Kept open so a use case the API adds later still renders. */
  useCase: UseCase | (string & {});
  evidence: DocEvidenceLine[];
  alkira: string;
  story: DocStory;
  /** For M&A: when the deal was announced (pending) or completed. Empty otherwise. */
  dealDate: string;
  dealStatus: DealStatus;
  /** For a pending deal: the source's own words saying it has yet to complete. */
  dealPendingQuote: string;
}

export interface DocSnapshotLine {
  /** Empty when the research found nothing. */
  text: string;
  sources: number[];
}

export interface DocSnapshot {
  clouds: DocSnapshotLine;
  cloudConnectivity: DocSnapshotLine;
  wan: DocSnapshotLine;
  firewalls: DocSnapshotLine;
  dataCenters: DocSnapshotLine;
  plantNetworks: DocSnapshotLine;
}

export interface DocPerson {
  /** Empty when no source names the person: the role is then who to look for. */
  name: string;
  role: string;
  note: string;
  sources: number[];
}

export interface DocQuestion {
  question: string;
  listenFor: string;
  alkiraAngle: string;
  /** Which angle the question is about, counting from 1. 0 for none. */
  angle: number;
}

export interface DocReference {
  n: number;
  title: string;
  url: string;
  date: string;
  sourceType: SourceType;
  /** True when `date` is the day the research saw this posting open. */
  openPosting: boolean;
}

export interface DocResearch {
  searches: number;
  pages: number;
  seconds: number;
  stoppedBy: string;
}

export interface BriefDoc {
  company: DocCompany;
  stats: DocStats;
  fit: DocFit;
  angles: DocAngle[];
  snapshot: DocSnapshot;
  people: DocPerson[];
  questions: DocQuestion[];
  unconfirmed: string[];
  raiseScore: string[];
  format: number;
  version: number;
  language: string;
  /** The day the brief was generated, YYYY-MM-DD. */
  generated: string;
  references: DocReference[];
  research: DocResearch;
}

export type BriefStreamEvent =
  | { type: "phase"; phase: BriefPhase }
  | { type: "done"; briefId: string; reusedFrom: string | null }
  | { type: "error"; message: string };

/** Every non-stream Brief API response. */
export interface Envelope<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}
