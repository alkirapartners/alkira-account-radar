import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderResult } from "@testing-library/react";
import { LazyMotion, MotionConfig, domMax } from "motion/react";
import type { ReactElement, ReactNode } from "react";

import { ToastProvider } from "@/components/ui/toast";

/** The app's providers, with retries off so a failing query fails at once. */
export function TestProviders({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <LazyMotion features={domMax} strict>
        <MotionConfig reducedMotion="always">
          <ToastProvider>{children}</ToastProvider>
        </MotionConfig>
      </LazyMotion>
    </QueryClientProvider>
  );
}

export function renderWithProviders(ui: ReactElement): RenderResult {
  return render(ui, { wrapper: TestProviders });
}
