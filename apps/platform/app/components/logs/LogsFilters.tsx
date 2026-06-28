"use client";

import { Pause, Play } from "lucide-react";

/** The levels the runtime emits, in severity order, offered as filter toggles. */
export const LEVELS = ["ERROR", "WARN", "INFO", "DEBUG"] as const;

/** One app the user can scope to, derived from the log rows seen so far. */
export interface AppOption {
  deploymentId: string;
  appName: string;
  appVersion: string;
}

/** The filter values the controls edit. A subset of the model's LogFilters that
 * the user drives directly; paging (before/limit) is owned by the monitor. */
export interface FilterValues {
  deploymentId: string;
  levels: string[];
  from: string;
  to: string;
  q: string;
}

const inputClass =
  "rounded-md border border-black/10 bg-white/60 px-2.5 py-1.5 text-sm outline-none focus:border-sky-500/40 dark:border-white/10 dark:bg-white/[0.04]";

/**
 * The logs filter bar: free-text search, an app scope (populated from the apps
 * seen in results), level toggles, and a time range. Editing any control calls
 * onChange with the full next value so the monitor can re-query from the top.
 */
export default function LogsFilters({
  value,
  apps,
  onChange,
  tailing,
  onToggleTail,
}: {
  value: FilterValues;
  apps: AppOption[];
  onChange: (next: FilterValues) => void;
  /** Whether live tailing (polling for new rows) is on. */
  tailing: boolean;
  onToggleTail: () => void;
}) {
  const toggleLevel = (level: string) => {
    const levels = value.levels.includes(level)
      ? value.levels.filter((l) => l !== level)
      : [...value.levels, level];
    onChange({ ...value, levels });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="search"
        value={value.q}
        onChange={(e) => onChange({ ...value, q: e.target.value })}
        placeholder="Search messages…"
        className={`${inputClass} min-w-[12rem] flex-1`}
      />

      <select
        value={value.deploymentId}
        onChange={(e) => onChange({ ...value, deploymentId: e.target.value })}
        className={inputClass}
        aria-label="Filter by app"
      >
        <option value="">All apps</option>
        {apps.map((a) => (
          <option key={a.deploymentId} value={a.deploymentId}>
            {a.appName || a.deploymentId}
            {a.appVersion ? ` (${a.appVersion})` : ""}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1">
        {LEVELS.map((level) => {
          const on = value.levels.includes(level);
          return (
            <button
              key={level}
              type="button"
              onClick={() => toggleLevel(level)}
              aria-pressed={on}
              className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                on
                  ? "bg-sky-600 text-white"
                  : "bg-black/[0.05] text-zinc-500 hover:bg-black/[0.08] dark:bg-white/[0.06] dark:text-zinc-400"
              }`}
            >
              {level}
            </button>
          );
        })}
      </div>

      <label className="flex items-center gap-1 text-xs text-zinc-500">
        from
        <input
          type="datetime-local"
          value={value.from}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
          className={inputClass}
        />
      </label>
      <label className="flex items-center gap-1 text-xs text-zinc-500">
        to
        <input
          type="datetime-local"
          value={value.to}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
          className={inputClass}
        />
      </label>

      <button
        type="button"
        onClick={onToggleTail}
        aria-pressed={tailing}
        className={`ml-auto flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
          tailing
            ? "bg-emerald-600 text-white hover:bg-emerald-500"
            : "bg-black/[0.05] text-zinc-600 hover:bg-black/[0.08] dark:bg-white/[0.06] dark:text-zinc-300"
        }`}
      >
        {tailing ? <Pause size={14} /> : <Play size={14} />}
        {tailing ? "Tailing" : "Tail"}
      </button>
    </div>
  );
}
