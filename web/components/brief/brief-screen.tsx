"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleAlert, FileX, RotateCw } from "lucide-react";
import { m } from "motion/react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button, buttonClasses } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { useScrolledPast } from "@/hooks/use-scrolled";
import { deleteBrief, getBrief } from "@/lib/brief-api";
import { refreshBrief } from "@/lib/brief-stream";
import type { BriefSummary } from "@/lib/brief-types";
import { rise, stagger } from "@/lib/motion";
import { ApiError } from "@/lib/session";

import { AmbientPanel } from "./ambient-panel";
import { BriefActions } from "./brief-actions";
import { BriefBody, BriefTop } from "./brief-layout";
import { BriefSkeleton } from "./brief-skeleton";
import { PinnedBar } from "./pinned-bar";
import { ProgressView } from "./progress-view";
import { useGeneration, type GenerationResult } from "./use-generation";

interface BriefScreenProps {
  id: string;
}

const OPEN_BRIEF_DELAY_MS = 550;
const NOT_FOUND_STATUS = 404;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const BRIEFS_KEY = ["briefs"];

export function BriefScreen({ id }: BriefScreenProps) {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // Sits at the end of the header; once it scrolls under the top bar, the pinned bar takes over.
  const [headerEnd, pastHeader] = useScrolledPast<HTMLDivElement>("-72px 0px 0px 0px");

  const brief = useQuery({ queryKey: ["brief", id], queryFn: () => getBrief(id) });

  const reusedParam = params.get("reused") ?? "";
  const reusedFrom = ISO_DATE.test(reusedParam) ? reusedParam : null;

  useEffect(() => {
    if (brief.data) document.title = `Alkira | ${brief.data.company}`;
  }, [brief.data]);

  // Set once this brief no longer exists on the server (updated or deleted).
  const gone = useRef(false);
  useEffect(
    () => () => {
      // Its cached copy is dropped only after this screen has left. Dropping it
      // while the screen still shows would make the screen ask for it again,
      // get a 404, and flash "not found" on the way out.
      if (gone.current) queryClient.removeQueries({ queryKey: ["brief", id] });
    },
    [id, queryClient],
  );

  const onUpdated = useCallback(
    (result: GenerationResult) => {
      gone.current = true;
      void queryClient.invalidateQueries({ queryKey: BRIEFS_KEY });
      setTimeout(() => router.replace(`/briefs/${result.briefId}` as Route), OPEN_BRIEF_DELAY_MS);
    },
    [queryClient, router],
  );
  const update = useGeneration(onUpdated);

  const remove = useMutation({
    mutationFn: () => deleteBrief(id),
    // Optimistic: the row leaves the list and the page moves on at once.
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: BRIEFS_KEY });
      const previous = queryClient.getQueryData<BriefSummary[]>(BRIEFS_KEY);
      queryClient.setQueryData<BriefSummary[]>(BRIEFS_KEY, (current) => current?.filter((item) => item.id !== id));
      router.push("/");
      return { previous };
    },
    onSuccess: () => {
      gone.current = true;
      toast({ title: "Brief deleted" });
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(BRIEFS_KEY, context.previous);
      toast({ title: "The brief couldn't be deleted. It's back in your list.", tone: "error" });
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: BRIEFS_KEY }),
  });

  if (brief.isPending) {
    return (
      <div className="page pb-20 pt-6">
        <BriefSkeleton />
      </div>
    );
  }

  if (brief.isError) {
    const missing = brief.error instanceof ApiError && brief.error.status === NOT_FOUND_STATUS;
    return (
      <div className="page pb-20 pt-10">
        <div className="card">
          {missing ? (
            <EmptyState
              icon={<FileX className="h-6 w-6" />}
              title="This brief isn't here"
              description="It may have been deleted or updated, or the link belongs to a different account."
              action={
                <Link href="/" className={buttonClasses("secondary")}>
                  Back to your briefs
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={<RotateCw className="h-6 w-6" />}
              title="The brief didn't load"
              description="This is usually a brief network hiccup. Nothing has been lost."
              action={
                <Button variant="secondary" onClick={() => void brief.refetch()}>
                  Try again
                </Button>
              }
            />
          )}
        </div>
      </div>
    );
  }

  const data = brief.data;
  const updating = update.state.status === "running" || update.state.status === "done";
  const startUpdate = () => void update.start(data.company, (onEvent) => refreshBrief(id, { language: data.language }, onEvent));

  const actions = (compact: boolean) => (
    <BriefActions
      briefId={id}
      disabled={updating || remove.isPending}
      onUpdate={startUpdate}
      onDelete={() => setConfirmingDelete(true)}
      compact={compact}
    />
  );

  return (
    <>
      <PinnedBar visible={pastHeader && !updating} company={data.company} score={data.score} actions={actions(true)} />

      <m.article variants={stagger(0.06)} initial="hidden" animate="shown" className="page pb-24 pt-4 sm:pt-6">
        <BriefTop brief={data} reusedFrom={reusedFrom} actions={actions(false)} />
        <div ref={headerEnd} aria-hidden="true" className="h-px" />

        {update.state.status === "error" ? (
          <m.p
            variants={rise}
            role="alert"
            className="mt-6 flex items-start gap-2.5 rounded-inner border border-negative/20 bg-negative-tint px-4 py-3 text-sm text-negative"
          >
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {update.state.message} Your current brief is unchanged.
          </m.p>
        ) : null}

        <div className="mt-8 sm:mt-10">
          {update.state.status === "running" || update.state.status === "done" ? (
            <m.div variants={rise}>
              <AmbientPanel>
                <div className="p-6 sm:p-10 lg:p-12">
                  <ProgressView
                    company={update.state.company}
                    phase={update.state.status === "done" ? "done" : update.state.phase}
                    startedAt={update.state.startedAt}
                    verb="Updating"
                  />
                </div>
              </AmbientPanel>
            </m.div>
          ) : (
            <BriefBody brief={data} />
          )}
        </div>
      </m.article>

      <Dialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title="Delete this brief?"
        description={`The brief for ${data.company} will be removed from your list. This cannot be undone.`}
      >
        <Button variant="secondary" onClick={() => setConfirmingDelete(false)}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            setConfirmingDelete(false);
            remove.mutate();
          }}
        >
          Delete brief
        </Button>
      </Dialog>
    </>
  );
}
