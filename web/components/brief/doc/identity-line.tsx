import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

import { hostOf, isWebAddress } from "@/lib/brief-doc";
import type { DocCompany } from "@/lib/brief-types";

interface IdentityLineProps {
  company: DocCompany;
  /** The name in the page's heading, which the legal name is not repeated after. */
  name: string;
  /** How the company is owned, with its listing: "Public (NYSE: DINO)". */
  ownership: string;
  /** "Which company", in the brief's language. */
  label: string;
}

/** The company's own site, opened in a new tab. Its ::after pad brings the touch target to 44px. */
function SiteLink({ href, host }: { href: string; host: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative inline-flex items-center gap-0.5 underline decoration-ink/20 underline-offset-[3px] transition-colors duration-fast after:absolute after:-inset-x-1 after:-inset-y-3 after:content-[''] hover:text-accent hover:decoration-accent"
    >
      {host}
      <ArrowUpRight
        className="h-3.5 w-3.5 shrink-0 transition-transform duration-fast ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </a>
  );
}

/** Which company the brief resolved: its legal entity, how it is owned, its site, and a note when names collide. */
export function IdentityLine({ company, name, ownership, label }: IdentityLineProps) {
  const legalName = company.legalName.trim();
  const website = company.website.trim();
  const host = isWebAddress(website) ? hostOf(website) : "";
  const note = company.identityNote.trim();
  // The legal name is left out when it only repeats the heading above it.
  const isSameName = legalName.toLowerCase() === name.trim().toLowerCase();
  const facts: ReactNode[] = [
    legalName && !isSameName ? <span className="font-medium text-ink">{legalName}</span> : null,
    ownership ? <span>{ownership}</span> : null,
    host ? <SiteLink href={website} host={host} /> : null,
  ].filter(Boolean);

  if (facts.length === 0 && !note) return null;

  return (
    <div className="mt-3.5 text-sm text-ink-2 [overflow-wrap:anywhere]">
      {facts.length > 0 ? (
        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          {facts.map((fact, index) => (
            <span key={index} className="inline-flex min-w-0 items-center gap-x-2.5">
              {fact}
              {index < facts.length - 1 ? <span aria-hidden="true" className="h-[3px] w-[3px] shrink-0 rounded-full bg-ink-3" /> : null}
            </span>
          ))}
        </p>
      ) : null}
      {note ? (
        <p className="mt-2 max-w-[72ch] text-[13px] leading-relaxed">
          <span className="font-medium text-ink">{label}:</span> {note}
        </p>
      ) : null}
    </div>
  );
}
