import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "oklch(18% 0 0)",
        surface: "oklch(98% 0 0)",
        accent: "oklch(60% 0.18 250)",
      },
    },
  },
  plugins: [],
};
export default config;
