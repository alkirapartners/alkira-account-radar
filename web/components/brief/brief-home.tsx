"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { m } from "motion/react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { listBriefs } from "@/lib/brief-api";
import { generateBrief } from "@/lib/brief-stream";
import type { Language } from "@/lib/brief-types";
import { stagger } from "@/lib/motion";
import { cleanCompany } from "@/lib/prefill";

import { GenerateBox } from "./generate-box";
import { Library, type LibrarySort } from "./library";
import { StatsRow } from "./stats-row";
import { useGeneration, type GenerationResult } from "./use-generation";

/** Lets the finished step tracker tick its last step before the page changes. */
const OPEN_BRIEF_DELAY_MS = 550;
/** Account Radar's "Generate brief" link arrives as /?company=<name>&domain=<domain>. */
const PREFILL_PARAMS = ["company", "domain"];
/**
 * Read once, then removed from the address. auth_email is what the old
 * sign-in page appended; nothing reads it now, so it is only tidied away.
 */
const CONSUMED_PARAMS = [...PREFILL_PARAMS, "auth_email"];

export function briefHref(result: GenerationResult): string {
  const base = `/briefs/${result.briefId}`;
  return result.reusedFrom ? `${base}?reused=${encodeURIComponent(result.reusedFrom.slice(0, 10))}` : base;
}

export function BriefHome() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const queryClient = useQueryClient();

  const briefs = useQuery({ queryKey: ["briefs"], queryFn: listBriefs });

  // The prefill is read once, then its params are removed so a refresh does not refill the field.
  const [prefill] = useState(() => cleanCompany(params.get("company")));
  const hasConsumedParams = CONSUMED_PARAMS.some((name) => params.has(name));

  const replaceParams = useCallback(
    (change: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(params.toString());
      change(next);
      const query = next.toString();
      router.replace(`${pathname}${query ? `?${query}` : ""}` as Route, { scroll: false });
    },
    [params, pathname, router],
  );

  useEffect(() => {
    if (hasConsumedParams) replaceParams((next) => CONSUMED_PARAMS.forEach((name) => next.delete(name)));
  }, [hasConsumedParams, replaceParams]);

  const onDone = useCallback(
    (result: GenerationResult) => {
      void queryClient.invalidateQueries({ queryKey: ["briefs"] });
      setTimeout(() => router.push(briefHref(result) as Route), OPEN_BRIEF_DELAY_MS);
    },
    [queryClient, router],
  );
  const generation = useGeneration(onDone);

  const onGenerate = useCallback(
    (company: string, language: Language) => {
      void generation.start(company, (onEvent) => generateBrief({ company, language }, onEvent));
    },
    [generation],
  );

  // undefined while loading, null once we know there are none.
  const latest = briefs.data
    ? briefs.data.reduce<(typeof briefs.data)[number] | null>(
        (newest, brief) => (newest === null || brief.createdAt > newest.createdAt ? brief : newest),
        null,
      )
    : undefined;

  const query = params.get("q") ?? "";
  const sort: LibrarySort = params.get("sort") === "fit" ? "fit" : "newest";

  return (
    <m.div variants={stagger(0.07)} initial="hidden" animate="shown" className="page space-y-8 pb-20 pt-4 sm:space-y-10 sm:pt-8">
      <GenerateBox state={generation.state} prefill={prefill} latest={latest} onGenerate={onGenerate} />
      {briefs.data ? <StatsRow briefs={briefs.data} /> : null}
      <Library
        briefs={briefs.data}
        isLoading={briefs.isPending}
        isError={briefs.isError}
        onRetry={() => void briefs.refetch()}
        query={query}
        onQueryChange={(value) => replaceParams((next) => (value ? next.set("q", value) : next.delete("q")))}
        sort={sort}
        onSortChange={(value) => replaceParams((next) => (value === "fit" ? next.set("sort", "fit") : next.delete("sort")))}
      />
    </m.div>
  );
}
