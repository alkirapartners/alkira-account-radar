import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { CountUp } from "@/components/ui/count-up";
import { Dialog } from "@/components/ui/dialog";
import { ScoreMeter } from "@/components/ui/score-meter";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TextField } from "@/components/ui/text-field";

import { TestProviders, renderWithProviders } from "../render";

describe("Button", () => {
  it("is disabled and marked busy while loading, and does not fire", async () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Save</Button>);

    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("defaults to type=button so it never submits a form by accident", () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole("button", { name: "Go" })).toHaveAttribute("type", "button");
  });
});

describe("TextField", () => {
  it("associates its visible label with the input", () => {
    render(<TextField label="Company" />);
    expect(screen.getByLabelText("Company")).toBeInstanceOf(HTMLInputElement);
  });

  it("announces an error and marks the input invalid", () => {
    render(<TextField label="Company" error="Enter a company name." />);

    const input = screen.getByLabelText("Company");
    const error = screen.getByRole("alert");
    expect(error).toHaveTextContent("Enter a company name.");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toContain(error.id);
  });
});

describe("SegmentedControl", () => {
  function Harness() {
    const [value, setValue] = useState<"en" | "es">("en");
    return (
      <SegmentedControl
        label="Brief language"
        value={value}
        onChange={setValue}
        options={[
          { value: "en", label: "English" },
          { value: "es", label: "Español" },
        ]}
      />
    );
  }

  it("is a labelled radio group with one option checked", () => {
    renderWithProviders(<Harness />);

    expect(screen.getByRole("radiogroup", { name: "Brief language" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "English" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Español" })).toHaveAttribute("aria-checked", "false");
  });

  it("changes value on click and with the arrow keys, wrapping at the ends", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);

    await user.click(screen.getByRole("radio", { name: "Español" }));
    expect(screen.getByRole("radio", { name: "Español" })).toHaveAttribute("aria-checked", "true");

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "English" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "English" })).toHaveFocus();

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("radio", { name: "Español" })).toHaveAttribute("aria-checked", "true");
  });

  it("keeps only the checked option in the tab order", () => {
    renderWithProviders(<Harness />);

    expect(screen.getByRole("radio", { name: "English" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("radio", { name: "Español" })).toHaveAttribute("tabindex", "-1");
  });
});

describe("ScoreMeter", () => {
  it("describes the score in words and fills that many ticks", () => {
    const { container } = renderWithProviders(<ScoreMeter score={4} scale={5} />);

    expect(screen.getByRole("img", { name: "Fit score 4 of 5, strong fit" })).toBeInTheDocument();
    expect(container.querySelectorAll("[data-filled]")).toHaveLength(4);
  });

  it("uses the ten-point bands for the radar", () => {
    renderWithProviders(<ScoreMeter score={6} scale={10} />);
    expect(screen.getByRole("img", { name: "Fit score 6 of 10, moderate fit" })).toBeInTheDocument();
  });

  it.each([null, undefined, 0])("reads %p as not scored and fills nothing", (score) => {
    const { container } = renderWithProviders(<ScoreMeter score={score} scale={5} />);

    expect(screen.getByRole("img", { name: "Fit score: not scored" })).toBeInTheDocument();
    expect(container.querySelectorAll("[data-filled]")).toHaveLength(0);
  });

  it("never fills more ticks than the scale has", () => {
    const { container } = renderWithProviders(<ScoreMeter score={9} scale={5} />);
    expect(container.querySelectorAll("[data-filled]")).toHaveLength(5);
  });
});

describe("CountUp", () => {
  it("gives assistive technology the final value once, and hides the animated digits from it", () => {
    const { container } = render(<TestProviders><CountUp value={3.7} decimals={1} /></TestProviders>);

    expect(container.querySelector(".sr-only")).toHaveTextContent("3.7");
    expect(container.querySelector("[aria-hidden='true']")).not.toBeNull();
    expect(container.querySelector("[aria-label]")).toBeNull();
  });

  it("shows the final value straight away under reduced motion", () => {
    // TestProviders forces reduced motion.
    const { container } = render(<TestProviders><CountUp value={42} /></TestProviders>);
    expect(container.querySelector("[aria-hidden='true']")).toHaveTextContent("42");
  });
});

describe("CopyButton", () => {
  it("copies its text and confirms", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    render(<CopyButton text="How is the migration going?" label="Copy question 1" />);

    await userEvent.click(screen.getByRole("button", { name: "Copy question 1" }));

    expect(writeText).toHaveBeenCalledWith("How is the migration going?");
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Copied"));
  });

  it("stays quiet when the clipboard refuses", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    render(<CopyButton text="x" label="Copy question 1" />);

    await userEvent.click(screen.getByRole("button", { name: "Copy question 1" }));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(screen.getByRole("status")).toHaveTextContent("");
  });
});

describe("Dialog", () => {
  it("is labelled by its title and description and closes on Escape", async () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange} title="Delete this brief?" description="This cannot be undone.">
        <button type="button">Cancel</button>
      </Dialog>,
    );

    const dialog = screen.getByRole("dialog", { name: "Delete this brief?" });
    expect(dialog).toHaveAccessibleDescription("This cannot be undone.");

    await userEvent.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders nothing while closed", () => {
    render(
      <Dialog open={false} onOpenChange={() => {}} title="Delete this brief?" description="x">
        <button type="button">Cancel</button>
      </Dialog>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
