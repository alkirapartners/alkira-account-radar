"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LazyMotion, MotionConfig, domMax } from "motion/react";
import { useState, type ReactNode } from "react";

import { ToastProvider } from "@/components/ui/toast";
import { ApiError, SessionExpiredError, goToSignIn } from "@/lib/session";

const STALE_MS = 30_000;
const MAX_RETRIES = 2;

/** An expired session anywhere sends the browser to sign-in, once. */
function handleError(error: unknown): void {
  if (error instanceof SessionExpiredError) goToSignIn();
}

/** Client errors (404, 409, 429) will not get better on a second try. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof SessionExpiredError) return false;
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < MAX_RETRIES;
}

function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({ onError: handleError }),
    mutationCache: new MutationCache({ onError: handleError }),
    defaultOptions: {
      queries: { staleTime: STALE_MS, retry: shouldRetry, refetchOnWindowFocus: false },
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Loaded with the page, not lazily: content starts hidden for its entrance, so it must not wait on a second chunk. */}
      <LazyMotion features={domMax} strict>
        <MotionConfig reducedMotion="user">
          <ToastProvider>{children}</ToastProvider>
        </MotionConfig>
      </LazyMotion>
    </QueryClientProvider>
  );
}
