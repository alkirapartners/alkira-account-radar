import ReactMarkdown, { type Components } from "react-markdown";

import { cn } from "@/lib/cn";

interface MarkdownProps {
  children: string;
  className?: string;
}

// Brief text is written by a model from third-party pages. Only inline
// formatting and simple lists are rendered; raw HTML stays inert text.
const ALLOWED_ELEMENTS = ["p", "strong", "em", "code", "a", "ul", "ol", "li", "br"];

const WEB_LINK = /^https?:\/\//i;

/** Anything that is not a plain web link loses its address. */
const webLinksOnly = (url: string) => (WEB_LINK.test(url) ? url : "");

const COMPONENTS: Components = {
  a({ href, children }) {
    if (!href) return <span>{children}</span>;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-accent underline decoration-accent/30 underline-offset-2 transition-colors duration-fast hover:decoration-accent"
      >
        {children}
      </a>
    );
  },
};

export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div
      className={cn(
        "space-y-2 [&_code]:rounded [&_code]:bg-ink/5 [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.92em] [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5",
        className,
      )}
    >
      <ReactMarkdown
        allowedElements={ALLOWED_ELEMENTS}
        unwrapDisallowed
        urlTransform={webLinksOnly}
        components={COMPONENTS}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
