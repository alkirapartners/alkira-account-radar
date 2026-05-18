export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}

const DELIMITERS = /[,\n\r\t]+/;

export function parseAccounts(
  raw: string,
  maxSize = 40,
): { accounts: string[]; unique: number } {
  const candidates = raw
    .split(DELIMITERS)
    .map((s) => s.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const accounts: string[] = [];
  for (const name of candidates) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    accounts.push(name);
  }

  if (accounts.length === 0) {
    throw new ParseError("Add at least one account name.");
  }
  if (accounts.length > maxSize) {
    throw new ParseError(
      `Please split into batches of ${maxSize} or fewer (you entered ${accounts.length} unique accounts).`,
    );
  }
  return { accounts, unique: accounts.length };
}
