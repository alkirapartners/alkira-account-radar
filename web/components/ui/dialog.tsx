"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** The action row. */
  children: ReactNode;
}

/**
 * A confirmation dialog. Radix supplies the focus trap, Escape handling and
 * labelling; the open and close motion is CSS keyed off its data-state, which
 * Radix waits for before unmounting.
 */
export function Dialog({ open, onOpenChange, title, description, children }: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-ambient/40 backdrop-blur-sm data-[state=closed]:animate-[overlay-out_150ms_var(--ease-in)_forwards] data-[state=open]:animate-[overlay-in_250ms_var(--ease-out)]" />
        <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <RadixDialog.Content className="pointer-events-auto w-full max-w-md rounded-card border border-line bg-surface p-6 shadow-lift outline-none data-[state=closed]:animate-[dialog-out_150ms_var(--ease-in)_forwards] data-[state=open]:animate-[dialog-in_250ms_var(--ease-out)] sm:p-7">
            <RadixDialog.Title className="text-lg font-semibold tracking-heading">{title}</RadixDialog.Title>
            <RadixDialog.Description className="mt-2 text-[15px] leading-relaxed text-ink-2">
              {description}
            </RadixDialog.Description>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{children}</div>
          </RadixDialog.Content>
        </div>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
