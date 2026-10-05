// Sample data for the local mock API. Shapes mirror the real Brief API and radar API.

const LABELS = {
  en: {
    alkira_fit: "Alkira Fit",
    cloud_platforms: "Cloud Platforms",
    on_prem: "On-Prem / Hybrid",
    deployment: "Deployment Model",
    complexity: "Resulting Complexity",
    signals_timing: "Signals & Timing",
    entry_points: "Three Alkira Entry Points",
    entry: "Entry",
    signal: "Signal",
    solution: "Solution",
    proof: "Proof",
    conversation_starters: "Conversation Starters",
    references: "References",
    confidential: "CONFIDENTIAL",
  },
  es: {
    alkira_fit: "Ajuste Alkira",
    cloud_platforms: "Plataformas Cloud",
    on_prem: "On-Prem / Híbrido",
    deployment: "Modelo de Despliegue",
    complexity: "Complejidad Resultante",
    signals_timing: "Señales y Oportunidad",
    entry_points: "Tres Puntos de Entrada Alkira",
    entry: "Punto",
    signal: "Señal",
    solution: "Solución",
    proof: "Evidencia",
    conversation_starters: "Temas de Conversación",
    references: "Referencias",
    confidential: "CONFIDENCIAL",
  },
};

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const ago = (ms) => new Date(Date.now() - ms).toISOString();

const NORTHWIND = {
  id: "0b6f2c1e-6f0e-4a57-9a3e-1d2c3b4a5f60",
  company: "Northwind Logistics",
  statsLine: "HQ: Memphis, TN | Revenue: $8.4B | Employees: 31,000 | Industry: Freight & Logistics",
  score: 5,
  scoreRationale:
    "Northwind runs production in AWS and Azure across 140 distribution sites, is midway through an MPLS exit, and absorbed two regional carriers in the past year. Multi-cloud, a live WAN refresh and M&A integration line up with all three Alkira entry points.",
  infra: {
    cloudPlatforms: "AWS (primary, confirmed), Azure for analytics, an early GCP footprint from an acquisition.",
    onPrem: "Two owned data centers in Memphis and Reno; 140 distribution sites on MPLS.",
    deployment: "Hybrid, with a stated goal of exiting one data center by 2027.",
    complexity: "Three clouds, two data centers and two acquired networks with overlapping address space.",
  },
  signals: [
    "MPLS contracts with two carriers expire in **Q2 2027**; an RFP for the replacement WAN is open",
    "New CIO joined from a cloud-native retailer in March 2026",
    "Acquired Redline Freight and Baywater Carriers in the last 12 months",
    "$400M technology modernization program announced on the FY2025 earnings call",
  ],
  entryPoints: [
    {
      heading: "Multi-cloud connectivity",
      signal: "Production workloads span AWS and Azure, with GCP arriving through Baywater.",
      solution: "Alkira connects all three clouds and both data centers through one policy-driven backbone.",
      proof: "A global logistics peer cut new-region turn-up from 12 weeks to 2 days.",
    },
    {
      heading: "MPLS replacement",
      signal: "Two carrier contracts end in Q2 2027 and the WAN RFP is live.",
      solution: "Backbone as a service replaces carrier MPLS without building transit hubs.",
      proof: "Customers report 40% lower WAN run cost after moving off MPLS.",
    },
    {
      heading: "M&A integration",
      signal: "Redline and Baywater networks overlap Northwind's address space.",
      solution: "Alkira onboards acquired networks with built-in NAT and segmentation, no re-addressing.",
      proof: "98% reduction in partner and acquisition integration time.",
    },
  ],
  startersMd: [
    "**Stakeholders:** CIO, VP Infrastructure, Director of Network Engineering",
    "",
    "**Best first question:** Lead with question 1.",
    "",
    '1. "With the MPLS contracts ending in 2027, are you replacing like for like or rethinking the backbone?"',
    "   *(You're listening for: timeline pressure and appetite for change. Alkira replaces MPLS without building transit hubs.)*",
    "",
    '2. "How are Redline and Baywater connected to your core network today, and what is still on the list?"',
    "   *(You're listening for: overlapping systems and manual work. Alkira onboards acquired networks without re-addressing.)*",
    "",
    '3. "When a new workload needs to reach both AWS and Azure, how long does that take your team?"',
    "   *(You're listening for: frustration with multi-cloud complexity. Alkira connects clouds 96% faster.)*",
  ].join("\n"),
  referencesMd: [
    "[1] Northwind FY2025 annual report — https://example.com/northwind/annual-report",
    "[2] Q4 earnings call transcript — https://example.com/northwind/q4-call",
    "[3] CIO appointment announcement — https://example.com/northwind/cio",
    "[4] Baywater Carriers acquisition — https://example.com/northwind/baywater",
  ].join("\n"),
  language: "en",
  createdAt: ago(3 * HOUR),
};

const MERIDIAN = {
  id: "5a1d9e77-2b3c-4d4e-8f90-a1b2c3d4e5f6",
  company: "Meridian Health Partners",
  statsLine: "HQ: Columbus, OH | Revenue: $5.1B | Employees: 22,400 | Industry: Healthcare",
  score: 4,
  scoreRationale:
    "Meridian is consolidating 31 hospitals onto Azure after its Epic migration and has a board-level zero trust mandate. Strong segmentation and cloud on-ramp fit; the WAN is under contract through 2028, which slows the backbone conversation.",
  infra: {
    cloudPlatforms: "Azure (Epic hosting, confirmed), AWS for imaging archives.",
    onPrem: "Three regional data centers; 31 hospitals and 240 clinics on SD-WAN.",
    deployment: "Hybrid, cloud-first for new clinical systems.",
    complexity: "Clinical, research and guest traffic share infrastructure across 270 sites.",
  },
  signals: [
    "Epic migration to Azure completes in early 2027",
    "Board mandate for zero trust segmentation after a 2025 regional outage",
    "Imaging archive moving to AWS creates a second cloud to connect",
  ],
  entryPoints: [
    {
      heading: "Zero trust segmentation",
      signal: "The board mandate requires clinical, research and guest traffic to be separated.",
      solution: "Alkira applies segmentation and firewall insertion as policy across cloud and on-prem.",
      proof: "Aligns to NIST SP 800-207 zero trust architecture.",
    },
    {
      heading: "Cloud on-ramp for Epic",
      signal: "31 hospitals need predictable paths to Azure before go-live.",
      solution: "A managed on-ramp connects every site to Azure with consistent latency and policy.",
      proof: "96% faster connection time than building transit hubs in-house.",
    },
    {
      heading: "Second-cloud connectivity",
      signal: "Imaging on AWS must reach clinical systems on Azure.",
      solution: "Alkira links both clouds through one backbone with inspection in the path.",
      proof: "A hospital network connected two clouds in under a week.",
    },
  ],
  startersMd: [
    "**Stakeholders:** CISO, VP Network Services, Epic program lead",
    "",
    '1. "What does the zero trust mandate require of the network by the Epic go-live date?"',
    '2. "How will imaging on AWS reach clinicians working in Azure-hosted Epic?"',
  ].join("\n"),
  referencesMd: [
    "[1] Meridian 2025 community report — https://example.com/meridian/report",
    "[2] Epic on Azure announcement — https://example.com/meridian/epic",
  ].join("\n"),
  language: "en",
  createdAt: ago(2 * DAY),
};

const CEMEX = {
  id: "9c8b7a65-4321-4fed-b0a9-876543210fed",
  company: "Cementos del Norte",
  statsLine: "Sede: Monterrey, MX | Ingresos: $3.2B | Empleados: 14,000 | Industria: Materiales",
  score: 3,
  scoreRationale:
    "Cementos del Norte opera en Azure con una red MPLS estable y sin iniciativas de renovación anunciadas. Hay ajuste en conectividad multicloud a mediano plazo, pero falta un evento que acelere la decisión.",
  infra: {
    cloudPlatforms: "Azure (confirmado), SAP en nube privada.",
    onPrem: "Dos centros de datos en Monterrey; 60 plantas en MPLS.",
    deployment: "Híbrido, con migración gradual de SAP.",
    complexity: "Plantas distribuidas en cuatro países con operadores distintos.",
  },
  signals: [
    "Migración de SAP a Azure prevista para 2027",
    "Sin renovación de WAN anunciada antes de 2028",
  ],
  entryPoints: [
    {
      heading: "Conectividad multicloud",
      signal: "SAP se moverá a Azure mientras otras cargas siguen en nube privada.",
      solution: "Alkira conecta ambas nubes y los centros de datos con una sola política.",
      proof: "Conexión 96% más rápida que con hubs de tránsito propios.",
    },
  ],
  startersMd: [
    "**Interlocutores:** CIO, Director de Infraestructura",
    "",
    '1. "¿Cómo conectarán las plantas con SAP cuando esté en Azure?"',
  ].join("\n"),
  referencesMd: "[1] Informe anual 2025 — https://example.com/cdn/informe",
  language: "es",
  createdAt: ago(5 * DAY),
};

const SPARSE = {
  id: "11111111-2222-4333-8444-555555555555",
  company: "Zzyx Holdings",
  statsLine: "",
  score: 0,
  scoreRationale: "",
  infra: { cloudPlatforms: "", onPrem: "", deployment: "", complexity: "" },
  signals: [],
  entryPoints: [],
  startersMd: "",
  referencesMd: "",
  language: "en",
  createdAt: ago(9 * DAY),
};

function generic(id, company, score, industry, createdAt) {
  return {
    ...NORTHWIND,
    id,
    company,
    score,
    statsLine: `HQ: Chicago, IL | Revenue: $2.6B | Employees: 9,800 | Industry: ${industry}`,
    scoreRationale:
      score >= 4
        ? `${company} is expanding across two public clouds while consolidating regional networks, which maps cleanly to Alkira's multi-cloud and backbone use cases.`
        : `${company} has a single-cloud footprint and a recently renewed WAN contract. The fit is real but there is no near-term trigger.`,
    createdAt,
  };
}

export function seedBriefs() {
  return [
    NORTHWIND,
    generic("22222222-3333-4444-8555-666666666666", "Atlas Freight Systems", 5, "Transportation", ago(26 * HOUR)),
    MERIDIAN,
    generic("33333333-4444-4555-8666-777777777777", "Halcyon Retail Group", 4, "Retail", ago(3 * DAY)),
    CEMEX,
    generic("44444444-5555-4666-8777-888888888888", "Bluewater Energy", 3, "Energy", ago(6 * DAY)),
    generic("55555555-6666-4777-8888-999999999999", "Corvid Semiconductor", 2, "Semiconductors", ago(8 * DAY)),
    SPARSE,
  ];
}

export function newBrief(id, company, language) {
  return { ...generic(id, company, 4, "Software", new Date().toISOString()), language };
}

export function toSummary(brief) {
  const text = brief.scoreRationale;
  const snippet = text.length > 120 ? `${text.slice(0, 120).replace(/\s+\S*$/, "")}...` : text;
  return {
    id: brief.id,
    company: brief.company,
    score: brief.score,
    snippet,
    language: brief.language,
    createdAt: brief.createdAt,
  };
}

export function toDetail(brief) {
  return { ...brief, labels: LABELS[brief.language] ?? LABELS.en };
}

const RADAR_REASONS = {
  hot: [
    "Runs production in two or more public clouds",
    "Active WAN or data center consolidation program",
    "Recent acquisitions create network integration work",
  ],
  warm: [
    "Single primary cloud with a second one emerging",
    "Distributed sites on carrier MPLS",
    "No public trigger event in the last year",
  ],
  cool: [
    "Small footprint served by one cloud region",
    "Network is largely outsourced to a managed provider",
    "Limited multi-site or partner connectivity needs",
  ],
};

/** Deterministic pretend score so the same name always lands the same way. */
export function radarResult(name) {
  const lower = name.toLowerCase();
  if (lower.includes("error")) {
    return { score: null, reasons: [], status: "error", error_message: "Failed to score this account." };
  }
  if (lower.startsWith("zz")) {
    return { score: null, reasons: [], status: "done", error_message: null };
  }
  const sum = [...lower].reduce((total, ch) => total + ch.charCodeAt(0), 0);
  const score = (sum % 10) + 1;
  const band = score >= 8 ? "hot" : score >= 5 ? "warm" : "cool";
  return { score, reasons: RADAR_REASONS[band], status: "done", error_message: null };
}
