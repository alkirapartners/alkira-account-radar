"use client";

import { useEffect, useState } from "react";

/**
 * True once the sentinel element has scrolled up out of view. Uses an
 * IntersectionObserver instead of a scroll listener, so it costs nothing
 * while the page scrolls.
 *
 * Returns a callback ref, so the observer attaches whenever the sentinel
 * mounts, including after a loading state has been replaced by content.
 */
export function useScrolledPast<T extends Element>(rootMargin = "0px"): [(node: T | null) => void, boolean] {
  const [node, setNode] = useState<T | null>(null);
  const [past, setPast] = useState(false);

  useEffect(() => {
    if (!node) {
      setPast(false);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Out of view below the fold is "not reached yet", not "scrolled past".
        const rootTop = entry.rootBounds?.top ?? 0;
        setPast(!entry.isIntersecting && entry.boundingClientRect.top <= rootTop);
      },
      { rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, rootMargin]);

  return [setNode, past];
}
