import type { Config } from "tailwindcss";

const channel = (name: string) => `rgb(var(--${name}-rgb) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: channel("canvas"),
        surface: channel("surface"),
        sunken: channel("sunken"),
        ambient: { DEFAULT: channel("ambient"), raised: channel("ambient-raised") },
        ink: { DEFAULT: channel("ink"), 2: channel("ink-2"), 3: channel("ink-3") },
        "on-ambient": { DEFAULT: channel("on-ambient"), 2: channel("on-ambient-2") },
        accent: {
          DEFAULT: channel("accent"),
          strong: channel("accent-strong"),
          soft: channel("accent-soft"),
        },
        positive: { DEFAULT: channel("positive"), tint: channel("positive-tint") },
        warning: {
          DEFAULT: channel("warning"),
          fill: channel("warning-fill"),
          tint: channel("warning-tint"),
        },
        negative: { DEFAULT: channel("negative"), tint: channel("negative-tint") },
        line: { DEFAULT: "rgb(var(--ink-rgb) / 0.07)", strong: "rgb(var(--ink-rgb) / 0.13)" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        card: "var(--radius-card)",
        inner: "var(--radius-inner)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        lift: "var(--shadow-lift)",
        ambient: "var(--shadow-ambient)",
      },
      transitionDuration: {
        fast: "var(--dur-fast)",
        base: "var(--dur-base)",
        slow: "var(--dur-slow)",
      },
      transitionTimingFunction: {
        out: "var(--ease-out)",
        in: "var(--ease-in)",
      },
      letterSpacing: {
        display: "-0.026em",
        heading: "-0.018em",
      },
    },
  },
  plugins: [],
};

export default config;
