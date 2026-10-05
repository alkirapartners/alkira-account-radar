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
