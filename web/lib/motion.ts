import type { Transition, Variants } from "motion/react";

/** Durations in seconds, mirroring --dur-* in tokens.css. */
export const DUR = { fast: 0.15, base: 0.25, slow: 0.4 } as const;

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IN = [0.7, 0, 0.84, 0] as const;

/** The sliding active pill in tabs and segmented controls. */
export const SPRING_PILL: Transition = { type: "spring", stiffness: 520, damping: 40, mass: 0.9 };

/** Rows and tiles gliding to a new position. */
export const SPRING_LAYOUT: Transition = { type: "spring", stiffness: 380, damping: 36, mass: 1 };

const RISE_DISTANCE = 10;
const DEFAULT_STAGGER_STEP = 0.04;

/** Content arriving: fade and rise. Exits are faster than entrances. */
export const rise: Variants = {
  hidden: { opacity: 0, y: RISE_DISTANCE },
  shown: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE_OUT } },
  gone: { opacity: 0, y: -RISE_DISTANCE / 2, transition: { duration: DUR.fast, ease: EASE_IN } },
};

/** Parent variants that reveal `rise` children one after another. */
export function stagger(step: number = DEFAULT_STAGGER_STEP, delay = 0): Variants {
  return {
    hidden: {},
    shown: { transition: { staggerChildren: step, delayChildren: delay } },
  };
}

export const fade: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: DUR.base, ease: EASE_OUT } },
  gone: { opacity: 0, transition: { duration: DUR.fast, ease: EASE_IN } },
};
