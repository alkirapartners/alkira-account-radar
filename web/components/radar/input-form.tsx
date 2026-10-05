"use client";

import { ArrowRight } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { ParseError, parseAccounts } from "@/lib/parse-input";

interface InputFormProps {
  onSubmit: (raw: string) => Promise<void>;
  /** True while a batch is being scored. */
  disabled?: boolean;
}

const MAX_ACCOUNTS = 40;

function countUnique(raw: string): number | null {
  try {
    return parseAccounts(raw).unique;
  } catch {
    return null;
  }
}

export function InputForm({ onSubmit, disabled = false }: InputFormProps) {
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const unique = countUnique(raw);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      parseAccounts(raw);
    } catch (problem) {
      setError(problem instanceof ParseError ? problem.message : "Invalid input");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(raw);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor="accounts" className="mb-2 block text-sm font-medium text-on-ambient">
        Account names
      </label>
      <textarea
        id="accounts"
        value={raw}
        onChange={(event) => setRaw(event.target.value)}
        rows={8}
        spellCheck={false}
        disabled={disabled || submitting}
        aria-describedby={error ? "accounts-error accounts-count" : "accounts-count"}
        aria-invalid={error ? true : undefined}
        placeholder={"Acme\nGlobex, Initech\nWayne Enterprises"}
        className="block w-full resize-y rounded-inner border border-white/15 bg-white/[0.07] px-4 py-3.5 text-base leading-relaxed text-on-ambient outline-none transition-[border-color,box-shadow,background-color] duration-fast ease-out placeholder:text-on-ambient-2/70 hover:border-white/25 focus:border-accent-soft focus:bg-white/10 focus:ring-4 focus:ring-accent-soft/20 disabled:opacity-60"
      />
      {error ? (
        <p id="accounts-error" role="alert" className="mt-2 text-sm text-[#FDA4AF]">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p id="accounts-count" className="text-sm text-on-ambient-2">
          <span className="num text-on-ambient">{unique ?? 0}</span> of {MAX_ACCOUNTS} accounts
          <span className="hidden sm:inline"> · separate with commas or new lines</span>
        </p>
        <Button type="submit" size="lg" loading={submitting} disabled={disabled || !raw.trim()} className="w-full sm:w-auto">
          Score accounts
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </form>
  );
}
