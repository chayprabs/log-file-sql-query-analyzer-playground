"use client";

import type { LoadProgress } from "@/lib/engine/db";

interface LoadProgressBarProps {
  progress: LoadProgress | null;
}

function phaseLabel(phase: LoadProgress["phase"]): string {
  switch (phase) {
    case "reading":
      return "Reading file…";
    case "parsing":
      return "Parsing log lines…";
    case "inserting":
      return "Loading into SQLite…";
    default:
      return "Working…";
  }
}

export function LoadProgressBar({ progress }: LoadProgressBarProps) {
  if (!progress) {
    return null;
  }

  const percent =
    progress.total > 0
      ? Math.min(100, Math.round((progress.current / progress.total) * 100))
      : progress.phase === "reading"
        ? 5
        : 0;

  const detail =
    progress.total > 0
      ? `${Math.min(progress.current, progress.total).toLocaleString()} / ${progress.total.toLocaleString()}`
      : null;

  return (
    <div className="w-full max-w-md" aria-live="polite" role="status">
      <div className="mb-2 flex justify-between text-xs text-neutral-600">
        <span>{phaseLabel(progress.phase)}</span>
        {detail ? <span>{detail}</span> : null}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
        <div
          className="h-full rounded-full bg-neutral-900 transition-all duration-200"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
