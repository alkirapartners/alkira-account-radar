import type { Metadata } from "next";

import { RadarHome } from "@/components/radar/radar-home";

export const metadata: Metadata = {
  title: "Account Radar",
  description: "Score up to 40 accounts at a time for Alkira fit",
};

export default function RadarPage() {
  return <RadarHome />;
}
