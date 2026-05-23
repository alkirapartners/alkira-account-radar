"use client";

import Link from "next/link";
import { useState } from "react";
import type { BatchSummary } from "@/lib/types";

interface Props {
  batches: BatchSummary[];
  activeId?: string;
  onRename?: (batchId: string, label: string) => Promise<void>;
}

function PencilIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.499.499 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11z" />
    </svg>
  );
}

export function HistorySidebar({ batches, activeId, onRename }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  function startEdit(b: BatchSummary, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(b.id);
    setEditValue(b.label ?? "");
  }

  async function save(batchId: string) {
    setEditingId(null);
    await onRename?.(batchId, editValue.trim());
  }

  function handleKeyDown(e: React.KeyboardEvent, batchId: string) {
    if (e.key === "Enter") {
      e.preventDefault();
      save(batchId);
    }
    if (e.key === "Escape") {
      setEditingId(null);
    }
  }

  return (
    <nav aria-label="Past batches" className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/50">
        Past Batches
      </h2>
      {batches.length === 0 ? (
        <p className="text-sm text-ink/50">No batches yet.</p>
      ) : (
        <ul className="space-y-1">
          {batches.map((b) => {
            const displayName =
              b.label?.trim() ||
              `${b.unique_count} account${b.unique_count === 1 ? "" : "s"}`;
            const isEditing = editingId === b.id;
            const isActive = activeId === b.id;
            return (
              <li key={b.id} className="group relative">
                {isEditing ? (
                  <div className="rounded-md bg-ink/5 px-3 py-2">
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => save(b.id)}
                      onKeyDown={(e) => handleKeyDown(e, b.id)}
                      placeholder={`${b.unique_count} account${b.unique_count === 1 ? "" : "s"}`}
                      className="w-full bg-transparent text-sm focus:outline-none"
                    />
                  </div>
                ) : (
                  <Link
                    href={{ pathname: `/batch/${b.id}` }}
                    className={`block rounded-md px-3 py-2 pr-7 text-sm hover:bg-ink/5 ${
                      isActive ? "bg-ink/5 font-medium" : ""
                    }`}
                  >
                    <span className="block truncate">{displayName}</span>
                    <span className="text-xs text-ink/50">
                      {new Date(b.created_at).toLocaleDateString()}
                    </span>
                    {b.status === "running" ? (
                      <span className="ml-2 text-xs text-amber-600">running…</span>
                    ) : null}
                  </Link>
                )}
                {!isEditing && (
                  <button
                    onClick={(e) => startEdit(b, e)}
                    title="Rename"
                    className="absolute right-2 top-2.5 text-ink/30 opacity-0 transition-opacity group-hover:opacity-100 hover:text-ink/60"
                  >
                    <PencilIcon />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
