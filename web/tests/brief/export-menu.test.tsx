import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BriefActions } from "@/components/brief/brief-actions";

import { renderWithProviders } from "../render";
import { LEGACY_ACTIONS_MARKUP, LEGACY_COMPACT_ACTIONS_MARKUP } from "./legacy-actions-markup";

const PDF_HREF = "/api/brief/briefs/b-doc/pdf";
const DOCX_HREF = "/api/brief/briefs/b-doc/docx";

interface Setup {
  hasDocument?: boolean;
  disabled?: boolean;
  compact?: boolean;
}

function setup({ hasDocument = true, disabled = false, compact = false }: Setup = {}) {
  const onUpdate = vi.fn();
  const onDelete = vi.fn();
  const view = renderWithProviders(
    <BriefActions briefId="b-doc" hasDocument={hasDocument} disabled={disabled} onUpdate={onUpdate} onDelete={onDelete} compact={compact} />,
  );
  return { ...view, onUpdate, onDelete, exportButton: () => screen.getByRole("button", { name: "Export" }) };
}

describe("a brief that carries a document", () => {
  it("offers one Export button where the Download PDF button used to be", () => {
    const { exportButton } = setup();

    expect(exportButton()).toHaveAttribute("aria-haspopup", "menu");
    expect(exportButton()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: /Download PDF/ })).toBeNull();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("lists PDF and Word, each a real link to its download", async () => {
    const { exportButton } = setup();
    const trigger = exportButton();

    await userEvent.click(trigger);

    const menu = await screen.findByRole("menu", { name: "Export" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const items = within(menu).getAllByRole("menuitem");
    expect(items.map((item) => item.textContent)).toEqual(["PDF", "Word (.docx)"]);
    expect(items.map((item) => item.tagName)).toEqual(["A", "A"]);
    expect(items.map((item) => item.getAttribute("href"))).toEqual([PDF_HREF, DOCX_HREF]);
    // No `download` attribute: an expired session must land on sign-in, not save a sign-in page as a file.
    for (const item of items) expect(item).not.toHaveAttribute("download");
  });

  it("keeps Update brief and More actions beside it", () => {
    setup();

    expect(screen.getByRole("button", { name: "Update brief" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More actions" })).toBeInTheDocument();
  });

  it("is switched off while an update is running, as the PDF button was", async () => {
    const { exportButton } = setup({ disabled: true });

    expect(exportButton()).toBeDisabled();
    await userEvent.click(exportButton());
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("uses the compact size in the pinned bar", () => {
    const { exportButton } = setup({ compact: true });

    expect(exportButton()).toHaveClass("h-10");
  });

  it("closes the menu once a download is chosen", async () => {
    // Following the link is the browser's job; keep the test page where it is.
    const keepPage = (event: Event) => event.preventDefault();
    document.addEventListener("click", keepPage);
    const { exportButton } = setup();

    await userEvent.click(exportButton());
    await userEvent.click(await screen.findByRole("menuitem", { name: "Word (.docx)" }));
    document.removeEventListener("click", keepPage);

    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });
});

describe("a brief with no document", () => {
  it("keeps the one Download PDF button, exactly as it was", () => {
    const { container } = setup({ hasDocument: false });

    expect((container.firstElementChild as HTMLElement).outerHTML.replace(/radix-[^"\s]+/g, "radix-id")).toBe(LEGACY_ACTIONS_MARKUP);
    expect(screen.getByRole("link", { name: "Download PDF" })).toHaveAttribute("href", PDF_HREF);
    expect(screen.queryByRole("button", { name: "Export" })).toBeNull();
  });

  it("keeps it exactly in the pinned bar too", () => {
    const { container } = setup({ hasDocument: false, compact: true });

    expect((container.firstElementChild as HTMLElement).outerHTML.replace(/radix-[^"\s]+/g, "radix-id")).toBe(LEGACY_COMPACT_ACTIONS_MARKUP);
  });

  it("is what a brief gets when the page does not say", () => {
    renderWithProviders(<BriefActions briefId="b-doc" disabled={false} onUpdate={() => {}} onDelete={() => {}} />);

    expect(screen.getByRole("link", { name: "Download PDF" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Export" })).toBeNull();
  });
});

describe("the Export menu from the keyboard", () => {
  it("opens on Enter and puts focus on the first option", async () => {
    const { exportButton } = setup();
    exportButton().focus();

    await userEvent.keyboard("{Enter}");

    expect(await screen.findByRole("menu")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("menuitem", { name: "PDF" })).toHaveFocus());
  });

  it("opens on Space", async () => {
    const { exportButton } = setup();
    exportButton().focus();

    await userEvent.keyboard(" ");

    expect(await screen.findByRole("menu")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("menuitem", { name: "PDF" })).toHaveFocus());
  });

  it("opens on the down arrow", async () => {
    const { exportButton } = setup();
    exportButton().focus();

    await userEvent.keyboard("{ArrowDown}");

    expect(await screen.findByRole("menu")).toBeInTheDocument();
  });

  it("moves between the options with the arrow keys, round the ends", async () => {
    const { exportButton } = setup();
    exportButton().focus();
    await userEvent.keyboard("{Enter}");
    const pdf = await screen.findByRole("menuitem", { name: "PDF" });
    const word = screen.getByRole("menuitem", { name: "Word (.docx)" });
    await waitFor(() => expect(pdf).toHaveFocus());

    await userEvent.keyboard("{ArrowDown}");
    expect(word).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(pdf).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}");
    expect(word).toHaveFocus();
    await userEvent.keyboard("{Home}");
    expect(pdf).toHaveFocus();
    await userEvent.keyboard("{End}");
    expect(word).toHaveFocus();
  });

  it("closes on Escape and gives focus back to the Export button", async () => {
    const { exportButton } = setup();
    exportButton().focus();
    await userEvent.keyboard("{Enter}");
    await screen.findByRole("menu");

    await userEvent.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(exportButton()).toHaveFocus();
    expect(exportButton()).toHaveAttribute("aria-expanded", "false");
  });

  it("closes when you click away from it", async () => {
    const { exportButton } = setup();
    await userEvent.click(exportButton());
    await screen.findByRole("menu");

    fireEvent.pointerDown(document.body);

    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });
});
