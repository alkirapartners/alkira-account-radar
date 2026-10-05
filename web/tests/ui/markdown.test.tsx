import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Markdown } from "@/components/ui/markdown";

describe("Markdown", () => {
  it("renders inline formatting and web links that open safely in a new tab", () => {
    render(<Markdown>{"**Bold** and [a source](https://example.com/report)"}</Markdown>);

    expect(screen.getByText("Bold").tagName).toBe("STRONG");
    const link = screen.getByRole("link", { name: "a source" });
    expect(link).toHaveAttribute("href", "https://example.com/report");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("does not render raw HTML or unsafe links", () => {
    const hostile = [
      '<img src="x" onerror="alert(1)">',
      "<script>alert(1)</script>",
      "[click me](javascript:alert(1))",
      "[data](data:text/html,<script>alert(1)</script>)",
    ].join("\n\n");

    const { container } = render(<Markdown>{hostile}</Markdown>);

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("[onerror]")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
    // The link text survives as plain text; only its address is dropped.
    expect(screen.getByText("click me")).toBeInTheDocument();
  });

  it("drops elements outside the allowed set but keeps their text", () => {
    const { container } = render(<Markdown>{"# A heading\n\n> quoted"}</Markdown>);

    expect(container.querySelector("h1")).toBeNull();
    expect(container.querySelector("blockquote")).toBeNull();
    expect(container.textContent).toContain("A heading");
    expect(container.textContent).toContain("quoted");
  });
});
