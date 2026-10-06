import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useScrolledPast } from "@/hooks/use-scrolled";

type Reading = Pick<IntersectionObserverEntry, "isIntersecting"> & {
  boundingClientRect: { top: number };
  rootBounds: { top: number } | null;
};

/** Stands in for the browser's observer, so a test can deliver readings itself. */
class FakeObserver {
  static latest: FakeObserver | null = null;

  constructor(private readonly callback: (readings: Reading[]) => void) {
    FakeObserver.latest = this;
  }

  observe(): void {}

  disconnect(): void {}

  deliver(readings: Reading[]): void {
    act(() => this.callback(readings));
  }
}

const reading = (isIntersecting: boolean, top: number): Reading => ({ isIntersecting, boundingClientRect: { top }, rootBounds: { top: 0 } });
const IN_VIEW = reading(true, 300);
const ABOVE_THE_WINDOW = reading(false, -2800);
const BELOW_THE_FOLD = reading(false, 1500);

function Probe() {
  const [sentinel, isPast] = useScrolledPast<HTMLDivElement>();
  return <div ref={sentinel}>{isPast ? "scrolled past" : "not yet"}</div>;
}

function deliver(readings: Reading[]): void {
  FakeObserver.latest?.deliver(readings);
}

describe("useScrolledPast", () => {
  beforeEach(() => {
    FakeObserver.latest = null;
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    render(<Probe />);
  });

  it("is true once the sentinel has left through the top of the window", () => {
    expect(screen.getByText("not yet")).toBeInTheDocument();

    deliver([ABOVE_THE_WINDOW]);
    expect(screen.getByText("scrolled past")).toBeInTheDocument();

    deliver([IN_VIEW]);
    expect(screen.getByText("not yet")).toBeInTheDocument();
  });

  it("is not true for a sentinel that is still below the fold", () => {
    deliver([BELOW_THE_FOLD]);
    expect(screen.getByText("not yet")).toBeInTheDocument();
  });

  it("goes by the newest reading when two arrive together", () => {
    // A jump from the top of the page to deep inside it, within one frame, reports both positions at once.
    deliver([IN_VIEW, ABOVE_THE_WINDOW]);
    expect(screen.getByText("scrolled past")).toBeInTheDocument();

    deliver([ABOVE_THE_WINDOW, IN_VIEW]);
    expect(screen.getByText("not yet")).toBeInTheDocument();
  });

  it("ignores an empty delivery", () => {
    deliver([ABOVE_THE_WINDOW]);
    deliver([]);
    expect(screen.getByText("scrolled past")).toBeInTheDocument();
  });
});
