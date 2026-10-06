// A brief stored as a document (format 2), for the local mock API: the response carries `doc` beside the
// legacy fields, as the real Brief API sends it. Its Word export is only offered for briefs like this one.

const DOC_LABELS_EN = {
  not_found: "Not found",
  not_found_public: "Not found in public sources.",
  identity: "Which company",
  stat_ownership: "Ownership",
  stat_cloud_network: "Cloud and network",
  lead: "Lead with",
  why_now: "Why this account, why now",
  angle: "Angle",
  evidence: "Evidence",
  alkira_answer: "What Alkira does",
  customer_story: "Customer story",
  proof_point: "Proof point",
  technical_snapshot: "Technical snapshot",
  snap_clouds: "Clouds",
  snap_cloud_connectivity: "Cloud connectivity",
  snap_wan: "WAN",
  snap_firewalls: "Firewalls",
  snap_data_centers: "Data centers",
  snap_plant_networks: "Plant networks",
  who_to_talk_to: "Who to talk to",
  questions: "Questions to ask",
  listen_for: "Listen for",
  alkira_angle: "Alkira angle",
  unconfirmed: "What we couldn't confirm",
  raise_score: "What would raise the score",
  source_second_hand: "second-hand",
  source_last_resort: "last-resort source",
  undated: "source undated",
  source_dated: "source dated {date}",
  open_posting_seen: "open posting, seen {date}",
};

const line = (text, sources) => ({ text, sources });

const DOC = {
  company: {
    name: "Harbor Fuels",
    legalName: "Harbor Fuels Corporation",
    ticker: "NYSE: HRBR",
    website: "https://www.harborfuels.example",
    identityNote: "Harbor Fuels Corporation of Dallas, not Harbor Fuel Oil of Maine.",
  },
  stats: {
    hq: "Dallas, Texas",
    revenue: "$26,869 million (FY2025)",
    employees: "5,165",
    industry: "Independent energy",
    ownership: "Public",
    cloudNetwork: "Azure with ExpressRoute and Virtual WAN, SD-WAN, Palo Alto firewalls",
  },
  fit: {
    score: 5,
    verdict: "A pending separation plus an open network posting.",
    lead: "Open with the Lubricants separation. Call the network engineering lead in Dallas.",
  },
  angles: [
    {
      title: "Lubricants separation needs its own network",
      useCase: "m_and_a",
      evidence: [
        { text: "Harbor plans to separate Lubricants as a new public company.", date: "2026-07-28", sources: [1] },
        { text: "An open Network Engineer posting covers ExpressRoute and vWAN.", date: "2026-10-06", sources: [2] },
      ],
      alkira: "Alkira runs the Lubricants network as its own segment on a shared fabric.",
      story: { id: "michaels", customer: "Michaels", result: "About 1,400 stores connected to Google Cloud in three weeks." },
      dealDate: "2026-07-28",
      dealStatus: "pending",
      dealPendingQuote: "The transaction is intended to be executed over the next 12-18 months.",
    },
  ],
  snapshot: {
    clouds: line("Azure, with AWS or GCP exposure preferred", [2]),
    cloudConnectivity: line("ExpressRoute, VPN, Azure Virtual WAN hub-and-spoke, BGP", [2]),
    wan: line("SD-WAN across data center, campus and branch networks", [2]),
    firewalls: line("", []),
    dataCenters: line("Hybrid environments across on-premises data center and cloud", [2]),
    plantNetworks: line("", []),
  },
  people: [{ name: "Dana Reyes", role: "Chief Information Officer", note: "Quoted in the release.", sources: [1] }],
  questions: [
    {
      question: "Which sites need their own connectivity first?",
      listenFor: "Shared services and a target date.",
      alkiraAngle: "Each side runs as a separate segment until cutover.",
      angle: 1,
    },
  ],
  unconfirmed: ["Which Azure regions connect today."],
  raiseScore: ["A named IT leader confirming the separation scope."],
  format: 2,
  version: 4,
  language: "en",
  generated: "2026-10-06",
  references: [
    {
      n: 1,
      title: "Harbor Fuels press release: separation of Lubricants",
      url: "https://www.harborfuels.example/press/2026/separation",
      date: "2026-07-28",
      sourceType: "first_hand",
      openPosting: false,
    },
    {
      n: 2,
      title: "Harbor Fuels careers: Network Engineer (open posting, seen 2026-10-06)",
      url: "https://careers.harborfuels.example/job/network-engineer",
      date: "2026-10-06",
      sourceType: "first_hand",
      openPosting: true,
    },
  ],
  research: { searches: 13, pages: 10, seconds: 79, stoppedBy: "finished" },
};

/** The stored brief; `toDetail` serves it as it is, since it carries its own labels. */
export function harborFuels(labels, createdAt) {
  return {
    id: "66666666-7777-4888-8999-aaaaaaaaaaaa",
    company: "Harbor Fuels",
    statsLine: "HQ: Dallas, Texas | Revenue: $26.9B (FY2025) | Employees: 5,165 | Ownership: Public (NYSE: HRBR)",
    score: 5,
    scoreRationale: "A pending separation plus an open network posting. Open with the Lubricants separation.",
    infra: {
      cloudPlatforms: "Azure, with AWS or GCP exposure preferred.",
      onPrem: "Hybrid environments across on-premises data center and cloud.",
      deployment: "ExpressRoute, VPN, Azure Virtual WAN hub-and-spoke, BGP.",
      complexity: "SD-WAN across data center, campus and branch networks.",
    },
    signals: ["Harbor plans to separate Lubricants as a new public company (source dated 28 Jul 2026)."],
    entryPoints: [
      {
        heading: "Lubricants separation needs its own network",
        signal: "An open Network Engineer posting covers ExpressRoute and vWAN.",
        solution: "Alkira runs the Lubricants network as its own segment on a shared fabric.",
        proof: "Michaels: About 1,400 stores connected to Google Cloud in three weeks.",
      },
    ],
    startersMd: '1. "Which sites need their own connectivity first?"',
    referencesMd: "[1] Harbor Fuels press release — https://www.harborfuels.example/press/2026/separation",
    language: "en",
    labels: { ...labels, ...DOC_LABELS_EN },
    createdAt,
    format: 2,
    doc: DOC,
  };
}
