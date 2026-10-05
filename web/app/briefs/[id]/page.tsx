import type { Metadata } from "next";
import { Suspense } from "react";

import { BriefScreen } from "@/components/brief/brief-screen";

export const metadata: Metadata = { title: "Brief" };

export default async function BriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // BriefScreen reads ?reused= from the query string, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <BriefScreen id={id} />
    </Suspense>
  );
}
