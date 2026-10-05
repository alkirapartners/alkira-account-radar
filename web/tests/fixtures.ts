import type { BriefDetail, BriefSummary } from "@/lib/brief-types";

export const LABELS_EN: Record<string, string> = {
  alkira_fit: "Alkira Fit",
  cloud_platforms: "Cloud Platforms",
  on_prem: "On-Prem / Hybrid",
  deployment: "Deployment Model",
  complexity: "Resulting Complexity",
  signals_timing: "Signals & Timing",
  entry: "Entry",
  signal: "Signal",
  solution: "Solution",
  proof: "Proof",
  conversation_starters: "Conversation Starters",
  references: "References",
};

export const LABELS_ES: Record<string, string> = {
  ...LABELS_EN,
  alkira_fit: "Ajuste Alkira",
  signals_timing: "Señales y Oportunidad",
  entry: "Punto",
  signal: "Señal",
  solution: "Solución",
  proof: "Evidencia",
  conversation_starters: "Temas de Conversación",
  references: "Referencias",
};

export const RICH_BRIEF: BriefDetail = {
  id: "b-rich",
  company: "TestCo Holdings",
  statsLine: "HQ: Austin, TX | Revenue: $5B",
  score: 4,
  scoreRationale: "TestCo runs production across Azure and AWS.",
  infra: {
    cloudPlatforms: "Azure (confirmed), AWS production workloads.",
    onPrem: "Reduced footprint after 2024 consolidation.",
    deployment: "Active hybrid cloud migration.",
    complexity: "Two clouds plus acquired networks.",
  },
  signals: ["Vendor consolidation announced **Q1 2026**", "New CIO from a cloud-native peer"],
  entryPoints: [
    { heading: "Multi-cloud connectivity", signal: "Runs Azure and AWS.", solution: "One backbone.", proof: "96% faster." },
    { heading: "Zero trust segmentation", signal: "Board mandate.", solution: "Policy overlay.", proof: "NIST aligned." },
    { heading: "M&A integration", signal: "Network sprawl.", solution: "Instant onboarding.", proof: "98% reduction." },
  ],
  startersMd: '**Stakeholders:** CIO, VP Network\n\n1. "How is the Azure-AWS connectivity going?"\n2. "What is the timeline on zero trust?"',
  referencesMd: "[1] TestCo 10-K — https://example.com/10k\n[2] CIO interview — https://example.com/interview",
  language: "en",
  labels: LABELS_EN,
  createdAt: "2026-10-05T09:00:00+00:00",
};

/** What the API returns when the model's output did not follow the template. */
export const SPARSE_BRIEF: BriefDetail = {
  id: "b-sparse",
  company: "Typed Name",
  statsLine: "",
  score: 0,
  scoreRationale: "",
  infra: { cloudPlatforms: "", onPrem: "", deployment: "", complexity: "" },
  signals: [],
  entryPoints: [],
  startersMd: "",
  referencesMd: "",
  language: "en",
  labels: LABELS_EN,
  createdAt: "2026-10-01T09:00:00+00:00",
};

export function summary(overrides: Partial<BriefSummary> = {}): BriefSummary {
  return {
    id: "b1",
    company: "Acme",
    score: 4,
    snippet: "A summary.",
    language: "en",
    createdAt: "2026-10-05T09:00:00+00:00",
    ...overrides,
  };
}
