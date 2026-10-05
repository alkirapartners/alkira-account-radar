"use client";

import { Check, CircleAlert } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

import { DUR, EASE_IN, EASE_OUT } from "@/lib/motion";

export type ToastTone = "success" | "error";

interface ToastInput {
  title: string;
  tone?: ToastTone;
}

interface ToastItem extends Required<ToastInput> {
  id: number;
}

interface ToastApi {
  toast: (input: ToastInput) => void;
}

const DISMISS_MS = 4000;

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside <ToastProvider>");
  return api;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const toast = useCallback(({ title, tone = "success" }: ToastInput) => {
    const id = nextId.current++;
    setItems((current) => [...current, { id, title, tone }]);
    setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), DISMISS_MS);
  }, []);

  const api = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <m.div
              key={item.id}
              layout
              role="status"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: DUR.base, ease: EASE_OUT } }}
              exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: DUR.fast, ease: EASE_IN } }}
              className="pointer-events-auto flex items-center gap-2.5 rounded-full bg-ambient py-2.5 pl-3 pr-5 text-sm font-medium text-on-ambient shadow-ambient"
            >
              <span
                className={
                  item.tone === "error"
                    ? "flex h-6 w-6 items-center justify-center rounded-full bg-negative text-white"
                    : "flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-accent-soft"
                }
                aria-hidden="true"
              >
                {item.tone === "error" ? <CircleAlert className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
              </span>
              {item.title}
            </m.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
