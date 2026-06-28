"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { LogEntry } from "@/app/model/logs";

/** Tailwind classes for each level's badge; unknown levels fall back to zinc. */
const LEVEL_CLASS: Record<string, string> = {
  ERROR: "bg-red-500/10 text-red-600 dark:text-red-400",
  WARN: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  INFO: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  DEBUG: "bg-black/[0.05] text-zinc-500 dark:bg-white/[0.06] dark:text-zinc-400",
};

function levelClass(level: string): string {
  return LEVEL_CLASS[level.toUpperCase()] ?? LEVEL_CLASS.DEBUG;
}

/** Render the record timestamp in the viewer's locale, second precision. */
function formatTime(ts: string): string {
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? ts : d.toLocaleString();
}

/**
 * The log table: one expandable row per event. Collapsed, a row shows time, level,
 * app, and the message; expanded, it shows the deployment id, version, store time,
 * and the full structured attrs as formatted JSON.
 */
export default function LogsTable({ entries }: { entries: LogEntry[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
      {entries.map((e) => (
        <LogRow key={e.id} entry={e} />
      ))}
    </div>
  );
}

function LogRow({ entry }: { entry: LogEntry }) {
  const [open, setOpen] = useState(false);
  const hasAttrs = Object.keys(entry.attrs).length > 0;

  return (
    <div className="border-b border-black/5 last:border-0 dark:border-white/5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-3 py-2 text-left transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
      >
        <ChevronRight
          size={15}
          className={`mt-0.5 shrink-0 text-zinc-400 transition-transform ${
            open ? "rotate-90" : ""
          }`}
        />
        <span className="mt-0.5 shrink-0 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
          {formatTime(entry.ts)}
        </span>
        <span
          className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase ${levelClass(
            entry.level,
          )}`}
        >
          {entry.level || "—"}
        </span>
        <span
          className="mt-0.5 hidden w-32 shrink-0 truncate text-xs text-zinc-500 sm:block dark:text-zinc-400"
          title={`${entry.appName}${entry.appVersion ? ` ${entry.appVersion}` : ""}`}
        >
          {entry.appName || entry.deploymentId}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm" title={entry.message}>
          {entry.message}
        </span>
      </button>

      {open && (
        <div className="border-t border-black/5 bg-black/[0.015] px-3 py-3 text-xs dark:border-white/5 dark:bg-white/[0.02]">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-zinc-600 dark:text-zinc-300">
            <dt className="text-zinc-400">app</dt>
            <dd>
              {entry.appName || "—"}
              {entry.appVersion ? ` · ${entry.appVersion}` : ""}
            </dd>
            <dt className="text-zinc-400">deployment</dt>
            <dd className="font-mono break-all">{entry.deploymentId}</dd>
            <dt className="text-zinc-400">stored</dt>
            <dd className="tabular-nums">{formatTime(entry.receivedAt)}</dd>
          </dl>
          {hasAttrs && (
            <pre className="mt-2 overflow-x-auto rounded-md bg-black/[0.04] p-2 font-mono text-[11px] leading-relaxed dark:bg-white/[0.04]">
              {JSON.stringify(entry.attrs, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
