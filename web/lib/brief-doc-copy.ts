// The few words the document layout needs that the API's label table does not
// carry: use-case names, deal status, and the two audience headings. In the
// brief's language, like the labels. English stands in for any other language.

import type { UseCase } from "./brief-types";

export interface DocCopy {
  askThis: string;
  forEngineer: string;
  firstHand: string;
  dealPending: string;
  dealCompleted: string;
  /** Takes {date}. */
  announced: string;
  /** Under a knowledge-base figure, so it is never read as a customer's result. */
  noStory: string;
  /** Takes {n}. */
  source: string;
  /** Takes {n}. */
  angle: string;
  /** Takes {searches}, {pages} and {seconds}. */
  research: string;
  /** Takes {date}. */
  generated: string;
  newTab: string;
  useCases: Record<UseCase, string>;
}

const COPY: Record<string, DocCopy> = {
  en: {
    askThis: "Ask this",
    forEngineer: "For the engineer",
    firstHand: "First-hand",
    dealPending: "Pending deal",
    dealCompleted: "Deal completed",
    announced: "announced {date}",
    noStory: "Alkira's headline figure for this use case. No customer story matched this angle.",
    source: "Source {n}",
    angle: "Angle {n}",
    research: "{searches} searches, {pages} pages opened, {seconds} seconds of research",
    generated: "Generated {date}",
    newTab: "opens in a new tab",
    useCases: {
      multi_cloud: "Multi-cloud",
      china_global: "China to global",
      firewall_consolidation: "Firewall consolidation",
      m_and_a: "M&A",
      network_modernization: "Network modernization",
      site_rollout: "Site rollout",
      partner_connectivity: "Partner connectivity",
    },
  },
  es: {
    askThis: "Pregunte esto",
    forEngineer: "Para el ingeniero",
    firstHand: "Fuente directa",
    dealPending: "Operación pendiente",
    dealCompleted: "Operación completada",
    announced: "anunciada el {date}",
    noStory: "Cifra de referencia de Alkira para este caso de uso. Ningún caso de cliente coincide con este ángulo.",
    source: "Fuente {n}",
    angle: "Ángulo {n}",
    research: "{searches} búsquedas, {pages} páginas abiertas, {seconds} segundos de investigación",
    generated: "Generado el {date}",
    newTab: "se abre en una pestaña nueva",
    useCases: {
      multi_cloud: "Multinube",
      china_global: "China a global",
      firewall_consolidation: "Consolidación de cortafuegos",
      m_and_a: "Fusiones y adquisiciones",
      network_modernization: "Modernización de red",
      site_rollout: "Despliegue de sitios",
      partner_connectivity: "Conectividad con socios",
    },
  },
};

export function docCopy(language: string): DocCopy {
  return COPY[language] ?? COPY.en;
}

/** Fill the {slots} of a copy string. A slot with no value is left as written. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (slot, key: string) => (key in values ? String(values[key]) : slot));
}

/** A use case's name. One this page does not know yet is shown as plain words. */
export function useCaseLabel(useCase: string, language: string): string {
  const known = docCopy(language).useCases[useCase as UseCase];
  if (known) return known;
  const words = useCase.replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
