import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { GenerateBox } from "@/components/brief/generate-box";
import type { GenerationState } from "@/components/brief/use-generation";

import { summary } from "../fixtures";
import { renderWithProviders } from "../render";

const IDLE: GenerationState = { status: "idle" };

function setup(state: GenerationState = IDLE, prefill = "") {
  const onGenerate = vi.fn();
  renderWithProviders(<GenerateBox state={state} prefill={prefill} latest={null} onGenerate={onGenerate} />);
  return { onGenerate, user: userEvent.setup() };
}

describe("GenerateBox", () => {
  it("submits the cleaned company name in the chosen language", async () => {
    const { onGenerate, user } = setup();

    await user.type(screen.getByLabelText("Company"), "  Acme   Robotics ");
    await user.click(screen.getByRole("radio", { name: "Español" }));
    await user.click(screen.getByRole("button", { name: /generate brief/i }));

    expect(onGenerate).toHaveBeenCalledWith("Acme Robotics", "es");
  });

  it("submits on Enter", async () => {
    const { onGenerate, user } = setup();

    await user.type(screen.getByLabelText("Company"), "Acme{Enter}");

    expect(onGenerate).toHaveBeenCalledWith("Acme", "en");
  });

  it("asks for a name instead of submitting an empty or blank one", async () => {
    const { onGenerate, user } = setup();

    await user.type(screen.getByLabelText("Company"), "   ");
    await user.click(screen.getByRole("button", { name: /generate brief/i }));

    expect(onGenerate).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a company name.");
    expect(screen.getByLabelText("Company")).toHaveFocus();
  });

  it("refuses a name over the limit and says why", async () => {
    const { onGenerate, user } = setup(IDLE, "x".repeat(100));

    await user.type(screen.getByLabelText("Company"), "y");
    await user.click(screen.getByRole("button", { name: /generate brief/i }));

    expect(onGenerate).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("limited to 100 characters");
  });

  it("clears the field error as soon as the partner types again", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /generate brief/i }));
    expect(screen.getByRole("alert")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Company"), "A");

    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("places a linked company in the field without submitting it", () => {
    const { onGenerate } = setup(IDLE, "Northwind Logistics");

    expect(screen.getByLabelText("Company")).toHaveValue("Northwind Logistics");
    expect(onGenerate).not.toHaveBeenCalled();
  });

  it("focuses the company field when / is pressed elsewhere on the page", async () => {
    const { user } = setup();
    expect(screen.getByLabelText("Company")).not.toHaveFocus();

    await user.keyboard("/");

    expect(screen.getByLabelText("Company")).toHaveFocus();
    expect(screen.getByLabelText("Company")).toHaveValue("");
  });

  it("shows why a generation failed and keeps the form usable", () => {
    setup({ status: "error", message: "Something went wrong while writing this brief. Please try again." });

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong while writing this brief.");
    expect(screen.getByRole("button", { name: /generate brief/i })).toBeEnabled();
  });

  it("replaces the form with live progress while a brief is being written", () => {
    setup({ status: "running", company: "Acme Robotics", phase: "research", startedAt: Date.now() });

    expect(screen.queryByLabelText("Company")).toBeNull();
    expect(screen.getByRole("heading", { name: "Acme Robotics" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Step 2 of 4: Researching");
    expect(screen.getByRole("status")).toHaveTextContent("Running 8 web searches");
    expect(screen.getByText(/you can leave this page/i)).toBeInTheDocument();
  });

  it("offers the latest brief to pick back up", () => {
    renderWithProviders(
      <GenerateBox state={IDLE} prefill="" latest={summary({ id: "b9", company: "Meridian Health" })} onGenerate={vi.fn()} />,
    );

    expect(screen.getByRole("link", { name: /meridian health/i })).toHaveAttribute("href", "/briefs/b9");
  });
});
