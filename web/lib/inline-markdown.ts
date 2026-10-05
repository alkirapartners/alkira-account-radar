// A deliberately small markdown reader for brief text: bold, emphasis, code,
// web links, and bullet lines. It produces a token tree, never HTML, so text
// written by a model from third-party pages can only ever be rendered as text
// and as links to http(s) addresses.

export type InlineToken =
  | { type: "text"; text: string }
  | { type: "strong"; children: InlineToken[] }
  | { type: "em"; children: InlineToken[] }
  | { type: "code"; text: string }
  | { type: "link"; href: string; children: InlineToken[] };

export type BlockToken =
  | { type: "paragraph"; children: InlineToken[] }
  | { type: "list"; items: InlineToken[][] };

// Alternatives, in priority order: **bold**, `code`, [text](address), *emphasis*.
// An address may hold one level of balanced parentheses, so the whole of
// "[x](javascript:alert(1))" is consumed and nothing of it is left behind.
const INLINE =
  /\*\*([^*]+?)\*\*|`([^`]+?)`|\[([^\]]+?)\]\(((?:[^()\s]+|\([^()\s]*\))+)\)|\*([^*\s](?:[^*]*?[^*\s])?)\*/;
const WEB_ADDRESS = /^https?:\/\//i;
const BULLET = /^[-*]\s+(.*)$/;

function inlineToken(match: RegExpExecArray): InlineToken[] {
  const [, strong, code, linkText, address, emphasis] = match;
  if (strong !== undefined) return [{ type: "strong", children: parseInline(strong) }];
  if (code !== undefined) return [{ type: "code", text: code }];
  if (emphasis !== undefined) return [{ type: "em", children: parseInline(emphasis) }];
  const children = parseInline(linkText);
  // Anything that is not a plain web address keeps its text and loses its link.
  return WEB_ADDRESS.test(address) ? [{ type: "link", href: address, children }] : children;
}

export function parseInline(source: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let rest = source;
  while (rest) {
    const match = INLINE.exec(rest);
    if (!match) {
      tokens.push({ type: "text", text: rest });
      break;
    }
    if (match.index > 0) tokens.push({ type: "text", text: rest.slice(0, match.index) });
    tokens.push(...inlineToken(match));
    rest = rest.slice(match.index + match[0].length);
  }
  return tokens;
}

export function parseBlocks(source: string): BlockToken[] {
  const blocks: BlockToken[] = [];
  for (const line of source.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const bullet = BULLET.exec(trimmed);
    const previous = blocks.at(-1);
    if (!bullet) {
      blocks.push({ type: "paragraph", children: parseInline(trimmed) });
    } else if (previous?.type === "list") {
      previous.items.push(parseInline(bullet[1]));
    } else {
      blocks.push({ type: "list", items: [parseInline(bullet[1])] });
    }
  }
  return blocks;
}
