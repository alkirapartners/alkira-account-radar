import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ResultRow } from "@/components/radar/result-row";
import type { ResultRow as Row } from "@/lib/types";

import { renderWithProviders } from "../render";

function row(overrides: Partial<Row> = {}): Row {
  return {
    id: "r1",
    account_name: "acme",
    resolved_name: "Acme Corp",
    resolved_domain: "acme.com",
    score: 8,
    reasons: ["Runs two clouds", "Active WAN refresh", "Recent acquisitions"],
    status: "done",
    error_message: null,
    ...overrides,
  };
}

const renderRow = (value: Row, onDelete = vi.fn()) => {
  renderWithProviders(<ul><ResultRow row={value} onDelete={onDelete} /></ul>);
  return onDelete;
};

describe("ResultRow", () => {
  it("shows a scored account with its band, reasons and a same-site brief link", () => {
    renderRow(row());

    expect(screen.getByRole("heading", { name: "Acme Corp" })).toBeInTheDocument();
    expect(screen.getByText("Hot")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Fit score 8 of 10, strong fit" })).toBeInTheDocument();
    expect(screen.getByText("Active WAN refresh")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /generate brief/i })).toHaveAttribute(
      "href",
      "/?company=Acme+Corp&domain=acme.com",
    );
  });

  it("shows a pending row as scoring, with no link and no delete", () => {
    renderRow(row({ status: "pending", score: null, resolved_name: null, resolved_domain: null, reasons: [] }));

    expect(screen.getByRole("heading", { name: "acme" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Scoring");
    expect(screen.queryByRole("link", { name: /generate brief/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();
  });

  it("tolerates a streamed row that has no reasons field yet", () => {
    const streamed = { ...row(), reasons: undefined } as unknown as Row;
    renderRow(streamed);

    expect(screen.getByRole("heading", { name: "Acme Corp" })).toBeInTheDocument();
  });

  it("explains an unrecognised company and still offers a brief", () => {
    renderRow(row({ score: null, resolved_name: null, resolved_domain: null, reasons: [] }));

    expect(screen.getByText(/not enough is known about this account/i)).toBeInTheDocument();
    expect(screen.queryByText("Hot")).toBeNull();
    expect(screen.getByRole("link", { name: /generate brief/i })).toHaveAttribute("href", "/?company=acme");
  });

  it("reports a failed score as an alert with no brief link", () => {
    renderRow(row({ status: "error", score: null, error_message: "Rate limited." }));

    expect(screen.getByRole("alert")).toHaveTextContent("Rate limited.");
    expect(screen.queryByRole("link", { name: /generate brief/i })).toBeNull();
  });

  it("deletes the result it belongs to", async () => {
    const onDelete = renderRow(row());

    await userEvent.click(screen.getByRole("button", { name: "Delete result for Acme Corp" }));

    expect(onDelete).toHaveBeenCalledWith("r1");
  });
});
