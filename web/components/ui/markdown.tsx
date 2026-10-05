import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { parseBlocks, type InlineToken } from "@/lib/inline-markdown";

interface MarkdownProps {
  children: string;
  className?: string;
}

function renderInline(tokens: InlineToken[]): ReactNode[] {
  return tokens.map((token, index) => {
    switch (token.type) {
      case "text":
        return token.text;
      case "strong":
        return <strong key={index}>{renderInline(token.children)}</strong>;
      case "em":
        return <em key={index}>{renderInline(token.children)}</em>;
      case "code":
        return <code key={index}>{token.text}</code>;
      case "link":
        return (
          <a
            key={index}
            href={token.href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent underline decoration-accent/30 underline-offset-2 transition-colors duration-fast hover:decoration-accent"
          >
            {renderInline(token.children)}
          </a>
        );
    }
  });
}

/**
 * Brief text, formatted. The text is written by a model from third-party
 * pages, so it goes through a token reader that can only yield text, simple
 * formatting and web links; React renders the rest as inert text.
 */
export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div
      className={cn(
        "space-y-2 [&_code]:rounded [&_code]:bg-ink/5 [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.92em] [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5",
        className,
      )}
    >
      {parseBlocks(children).map((block, index) =>
        block.type === "list" ? (
          <ul key={index}>
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>{renderInline(item)}</li>
            ))}
          </ul>
        ) : (
          <p key={index}>{renderInline(block.children)}</p>
        ),
      )}
    </div>
  );
}
