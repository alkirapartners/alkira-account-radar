"use client";

import { useEffect, useState } from "react";

import { resolveSection } from "@/lib/brief-sections";

// The reading line: a thin band a quarter of the way down the window. The
// section crossing it is the one being read.
const READING_BAND = "-25% 0px -70% 0px";
const WHOLLY_IN_VIEW = 1;

/**
 * The id of the section the reader is in, from a list of section ids in page
 * order. Uses IntersectionObservers, so it costs nothing while the page
 * scrolls. Null until a section has reached the reading line.
 */
export function useActiveSection(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  // A string, so the effect re-runs when the sections change and not on every render.
  const key = ids.join(" ");

  useEffect(() => {
    const order = key.split(" ").filter(Boolean);
    const nodes = order.map((id) => document.getElementById(id)).filter((node): node is HTMLElement => node !== null);
    if (nodes.length === 0) return;

    const inBand = new Set<string>();
    let isEndInView = false;
    const update = () =>
      setActive((previous) => resolveSection({ order, inBand, chosen: window.location.hash.slice(1), isEndInView, previous }));

    const band = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inBand.add(entry.target.id);
          else inBand.delete(entry.target.id);
        }
        update();
      },
      { rootMargin: READING_BAND },
    );
    for (const node of nodes) band.observe(node);

    // The last section may be too short to reach the reading line at the foot of the page.
    const end = new IntersectionObserver(
      ([entry]) => {
        isEndInView = entry.intersectionRatio >= WHOLLY_IN_VIEW;
        update();
      },
      { threshold: WHOLLY_IN_VIEW },
    );
    end.observe(nodes[nodes.length - 1]);

    // A jump to a section that is already on the line moves nothing, so no observer fires.
    window.addEventListener("hashchange", update);
    return () => {
      band.disconnect();
      end.disconnect();
      window.removeEventListener("hashchange", update);
    };
  }, [key]);

  return active;
}
