"use client";

import { useState } from "react";
import { parseAccounts, ParseError } from "@/lib/parse-input";

interface Props {
  onSubmit: (raw: string) => Promise<void>;
  disabled?: boolean;
}

export function InputForm({ onSubmit, disabled }: Props) {
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const previewCount = (() => {
    try { return parseAccounts(raw).unique; } catch { return null; }
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      parseAccounts(raw);
    } catch (err) {
      setError(err instanceof ParseError ? err.message : "Invalid input");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(raw);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label htmlFor="accounts" className="block text-sm font-medium">
        Account names (comma, newline, or tab separated, up to 40)
      </label>
      <textarea
        id="accounts"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={10}
        className="w-full rounded-lg border border-ink/15 p-3 font-mono text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        placeholder="Acme&#10;Globex, Initech&#10;Wayne Enterprises"
        disabled={disabled || submitting}
        aria-describedby="account-count"
      />
      <div className="flex items-center justify-between">
        <span id="account-count" className="text-sm text-ink/60">
          {previewCount != null ? `${previewCount} unique` : "—"}
        </span>
        <button
          type="submit"
          disabled={disabled || submitting || !raw.trim()}
          className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Starting…" : "Score Accounts"}
        </button>
      </div>
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
    </form>
  );
}
