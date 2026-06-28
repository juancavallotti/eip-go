/**
 * Pure helpers for the logs view: tuning constants, URL <-> filter serialization,
 * the model-filter builder, and the chronological comparator. Kept out of the
 * component so the monitor stays focused on state and effects.
 */

import type { LogEntry, LogFilters } from "@/app/model/logs";
import type { FilterValues } from "./LogsFilters";

/** Page size for the initial query and each "Load older" page. */
export const PAGE_SIZE = 200;
/** Smaller page polled while tailing — we only need what's newly arrived. */
export const TAIL_SIZE = 100;
/** How often to poll for new rows while tailing. */
export const TAIL_POLL_MS = 3000;
/** Debounce so typing in the search box doesn't fire a query per keystroke. */
export const DEBOUNCE_MS = 300;
/** Distance from the bottom (px) within which the view "sticks" to new rows. */
export const STICK_THRESHOLD = 80;

/** Convert a datetime-local value (local wall time) to RFC3339, or undefined. */
function toRFC3339(local: string): string | undefined {
  if (!local) return undefined;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** Map the UI filter values (plus an optional cursor) to a model LogFilters. */
export function buildFilters(
  v: FilterValues,
  before: string | undefined,
  limit: number,
): LogFilters {
  return {
    appName: v.appName || undefined,
    appVersion: v.appVersion || undefined,
    levels: v.levels.length ? v.levels : undefined,
    from: toRFC3339(v.from),
    to: toRFC3339(v.to),
    q: v.q || undefined,
    before,
    limit,
  };
}

/** Read the filter values out of the URL query string (for bookmarkability). */
export function readFilters(sp: URLSearchParams): FilterValues {
  return {
    appName: sp.get("appName") ?? "",
    appVersion: sp.get("appVersion") ?? "",
    levels: (sp.get("levels") ?? "").split(",").filter(Boolean),
    from: sp.get("from") ?? "",
    to: sp.get("to") ?? "",
    q: sp.get("q") ?? "",
  };
}

/** Serialize the filter values into a query string, omitting empty axes. */
export function writeFilters(f: FilterValues): string {
  const p = new URLSearchParams();
  if (f.appName) p.set("appName", f.appName);
  if (f.appVersion) p.set("appVersion", f.appVersion);
  if (f.levels.length) p.set("levels", f.levels.join(","));
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  if (f.q) p.set("q", f.q);
  return p.toString();
}

/** Oldest-first comparator so the list reads top-to-bottom like a terminal. */
export function byTimeAsc(a: LogEntry, b: LogEntry): number {
  return a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : a.id < b.id ? -1 : 1;
}
