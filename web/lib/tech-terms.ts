// Finds the technology terms in a line of the technical snapshot, so the page
// can set them apart from the words around them. A reading aid only: the list
// is a best guess kept here, and a term it misses is simply left as plain text.
//
// TODO: the API should own this. The writer knows which words in a snapshot
// line are products, vendors and protocols; when the document marks them
// (for example as spans beside each line's text), this word list goes.

export interface TechToken {
  text: string;
  term: boolean;
}

// Products, vendors and protocols, as they are normally written.
const KNOWN_TERMS: readonly string[] = [
  // Clouds
  "Amazon Web Services", "AWS", "Microsoft Azure", "Azure", "Google Cloud Platform", "Google Cloud", "GCP",
  "Oracle Cloud", "OCI", "Alibaba Cloud", "IBM Cloud",
  // Cloud networking
  "AWS Direct Connect", "Direct Connect", "ExpressRoute", "Azure Virtual WAN", "Virtual WAN", "vWAN", "Transit Gateway",
  "Cloud Interconnect", "PrivateLink", "Private Link", "Cloud WAN", "VNet", "VPC",
  // Network and security designs
  "SD-WAN", "MPLS", "BGP", "OSPF", "VPN", "IPsec", "SASE", "SSE", "ZTNA", "Zero Trust", "NGFW", "WAF", "SCADA", "5G",
  // Vendors and products
  "Palo Alto Networks", "Palo Alto", "Prisma Access", "Panorama", "Fortinet", "FortiGate", "Check Point", "Cisco",
  "Meraki", "Viptela", "Juniper", "Aruba", "Arista", "Zscaler", "Netskope", "Cloudflare", "Akamai", "Infoblox",
  "VeloCloud", "Silver Peak", "Aviatrix", "Equinix", "Megaport", "Honeywell Experion", "Foxboro", "Siemens", "Rockwell",
  // Automation and platforms
  "Terraform", "Ansible", "Python", "CloudFormation", "Kubernetes", "Databricks", "Azure Functions", "Azure DevOps",
  "Snowflake",
];

// Capitals that are not technology: places, titles, filings.
const EVERYDAY_CAPITALS: ReadonlySet<string> = new Set([
  "US", "USA", "UK", "EU", "UAE", "IT", "HQ", "HR", "FY", "CEO", "CIO", "CTO", "CFO", "COO", "CISO", "VP", "SVP", "EVP",
  "LLC", "INC", "NYSE", "SEC", "IRS", "Q1", "Q2", "Q3", "Q4", "H1", "H2",
]);

const REGEXP_SPECIALS = /[.*+?^${}()|[\]\\]/g;
const ACRONYM = "[A-Z][A-Z0-9]{1,5}";
// Longest first, so "Azure Virtual WAN" is one term and not "Azure" followed by "WAN".
const KNOWN_PATTERN = [...KNOWN_TERMS]
  .sort((first, second) => second.length - first.length)
  .map((term) => term.replace(REGEXP_SPECIALS, "\\$&"))
  .join("|");
// A term starts at the beginning or after a character that is not part of a
// word, and ends before one. Acronyms joined by slashes are tried first, so
// they stay together: "SSE/SASE".
const TERM = new RegExp(
  `(^|[^A-Za-z0-9])(${ACRONYM}(?:/${ACRONYM})+|${KNOWN_PATTERN}|${ACRONYM})(?![A-Za-z0-9])`,
  "g",
);

function isEveryday(candidate: string): boolean {
  return candidate.split("/").every((part) => EVERYDAY_CAPITALS.has(part));
}

/** The text as a run of plain words and technology terms, in order, nothing dropped. */
export function tokenizeTech(text: string): TechToken[] {
  const tokens: TechToken[] = [];
  let end = 0;
  for (const match of text.matchAll(TERM)) {
    const [, before, candidate] = match;
    if (isEveryday(candidate)) continue;
    const start = (match.index ?? 0) + before.length;
    if (start > end) tokens.push({ text: text.slice(end, start), term: false });
    tokens.push({ text: candidate, term: true });
    end = start + candidate.length;
  }
  if (end < text.length) tokens.push({ text: text.slice(end), term: false });
  return tokens;
}
