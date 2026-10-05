import type { Metadata } from "next";
import { Suspense } from "react";

import { BriefHome } from "@/components/brief/brief-home";

export const metadata: Metadata = { title: "Brief Generator" };

export default function Home() {
  // BriefHome reads the query string (prefill, search, sort), which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <BriefHome />
    </Suspense>
  );
}
