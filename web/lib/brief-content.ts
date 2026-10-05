// Readers for the markdown sections of a brief. The API sends section text as
// markdown; these pull out the parts the page lays out specially.

const NUMBERED_LINE = /^\d+\.\s+(.+)$/;
const WRAPPING_QUOTES = /^["“«]\s*|\s*["”»]$/g;
// "[1] Title — https://…"  Only web links are accepted: the text comes from a model.
const REFERENCE_LINE = /^\[(\d+)\]\s*(.+?)\s*[—–-]\s*(https?:\/\/\S+)$/;

export interface StarterQuestion {
  /** The question, without its number or wrapping quotes. */
  text: string;
  /** What to listen for in the answer, when the brief gives it. Empty otherwise. */
  hint: string;
}

export interface Starters {
  /** Lines before the first question (stakeholders, which question to lead with). Markdown. */
  notes: string[];
  questions: StarterQuestion[];
}

/** "*(You're listening for: …)*" → "You're listening for: …" */
const unwrapHint = (line: string) => line.replace(/^[*_]*\(?\s*/, "").replace(/\s*\)?[*_]*$/, "");

export function parseStarters(md: string): Starters {
  const notes: string[] = [];
  const questions: StarterQuestion[] = [];
  for (const line of md.split("\n")) {
    const text = line.trim();
    if (!text) continue;
    const numbered = NUMBERED_LINE.exec(text);
    const current = questions.at(-1);
    if (numbered) {
      questions.push({ text: numbered[1].replace(WRAPPING_QUOTES, ""), hint: "" });
    } else if (current) {
      // A line under a question belongs to it: the brief's "listening for" note.
      current.hint = [current.hint, unwrapHint(text)].filter(Boolean).join(" ");
    } else {
      notes.push(text);
    }
  }
  return { notes, questions };
}

export interface Reference {
  index: string;
  title: string;
  url: string;
}

/** Numbered references, plus any lines that did not fit the pattern (as markdown). */
export function parseReferences(md: string): { references: Reference[]; rest: string } {
  const references: Reference[] = [];
  const rest: string[] = [];
  for (const line of md.split("\n")) {
    const text = line.trim();
    if (!text) continue;
    const match = REFERENCE_LINE.exec(text);
    if (match) references.push({ index: match[1], title: match[2], url: match[3] });
    else rest.push(text);
  }
  return { references, rest: rest.join("\n") };
}

export interface Stat {
  label: string;
  value: string;
}

/** "HQ: Austin, TX | Revenue: $5B" → labelled pills. */
export function splitStats(statsLine: string): Stat[] {
  return statsLine
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const colon = part.indexOf(":");
      if (colon === -1) return { label: "", value: part };
      return { label: part.slice(0, colon).trim(), value: part.slice(colon + 1).trim() };
    });
}
