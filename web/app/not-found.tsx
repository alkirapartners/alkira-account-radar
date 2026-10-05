import { Compass } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <div className="page py-16">
      <div className="card">
        <EmptyState
          icon={<Compass className="h-6 w-6" />}
          title="We couldn't find that page"
          description="The link may be old, or the brief may have been deleted."
          action={
            <Link
              href="/"
              className="inline-flex h-11 items-center rounded-full bg-ink px-5 text-[15px] font-medium text-white transition-transform duration-fast ease-out active:scale-[0.97]"
            >
              Back to your briefs
            </Link>
          }
        />
      </div>
    </div>
  );
}
