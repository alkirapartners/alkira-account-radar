/** Matches the Brief API's cap, which matches the radar's cap on an account name. */
export const MAX_COMPANY_CHARS = 100;

const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F-\u009F]/g;

/**
 * Turn a typed or linked company name into text safe to submit. Control
 * characters and line breaks are flattened; an over-long value is ignored
 * outright. Mirrors clean_company_prefill in the Brief API.
 */
export function cleanCompany(raw: string | null | undefined): string {
  if (!raw) return "";
  const name = raw.replace(CONTROL_CHARACTERS, " ").split(/\s+/).filter(Boolean).join(" ");
  return name.length > MAX_COMPANY_CHARS ? "" : name;
}
