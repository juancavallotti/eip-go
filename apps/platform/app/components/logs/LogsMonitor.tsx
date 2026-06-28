"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollText } from "lucide-react";
import { EmptyState } from "@/app/(session)/platform/DashboardTiles";
import { listLogs, type LogEntry, type LogFilters } from "@/app/model/logs";
import LogsFilters, { type AppOption, type FilterValues } from "./LogsFilters";
import LogsTable from "./LogsTable";

/** Page size requested per fetch; also the threshold for offering "Load more". */
const PAGE_SIZE = 200;
/** Debounce window so typing in the search box doesn't fire a query per keystroke. */
const DEBOUNCE_MS = 300;

const EMPTY_FILTERS: FilterValues = {
  deploymentId: "",
  levels: [],
  from: "",
  to: "",
  q: "",
};

/** Convert a datetime-local value (local wall time) to RFC3339, or undefined. */
function toRFC3339(local: string): string | undefined {
  if (!local) return undefined;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** Map the UI filter values (plus an optional cursor) to a model LogFilters. */
function buildFilters(v: FilterValues, before?: string): LogFilters {
  return {
    deploymentId: v.deploymentId || undefined,
    levels: v.levels.length ? v.levels : undefined,
    from: toRFC3339(v.from),
    to: toRFC3339(v.to),
    q: v.q || undefined,
    before,
    limit: PAGE_SIZE,
  };
}

/**
 * The platform logs view: a filter bar over a paginated table of stored log
 * events, newest first. Changing a filter re-queries from the top (debounced);
 * "Load more" pages older rows via the keyset cursor. The app dropdown accumulates
 * the apps seen across fetched rows. Read-only; a failed/unconfigured query shows
 * the unavailable state rather than throwing.
 */
export default function LogsMonitor() {
  const [filters, setFilters] = useState<FilterValues>(EMPTY_FILTERS);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [apps, setApps] = useState<AppOption[]>([]);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Guards against a slow earlier query overwriting a newer one's results.
  const reqSeq = useRef(0);

  // Accumulate the distinct apps seen so far so the dropdown stays populated even
  // after the user scopes to one (the results would otherwise narrow to it).
  const mergeApps = useCallback((items: LogEntry[]) => {
    setApps((prev) => {
      const seen = new Set(prev.map((a) => a.deploymentId));
      const next = [...prev];
      for (const e of items) {
        if (e.deploymentId && !seen.has(e.deploymentId)) {
          seen.add(e.deploymentId);
          next.push({
            deploymentId: e.deploymentId,
            appName: e.appName,
            appVersion: e.appVersion,
          });
        }
      }
      next.sort((a, b) =>
        (a.appName || a.deploymentId).localeCompare(b.appName || b.deploymentId),
      );
      return next;
    });
  }, []);

  const load = useCallback(
    (f: FilterValues) => {
      const seq = ++reqSeq.current;
      setLoading(true);
      listLogs(buildFilters(f))
        .then(
          (page) => {
            if (seq !== reqSeq.current) return;
            setEntries(page.items);
            setNextBefore(page.nextBefore);
            mergeApps(page.items);
            setError(null);
          },
          (e) => {
            if (seq === reqSeq.current) setError((e as Error).message);
          },
        )
        .finally(() => {
          if (seq === reqSeq.current) setLoading(false);
        });
    },
    [mergeApps],
  );

  // Re-query from the top whenever the filters change, debounced.
  useEffect(() => {
    const id = setTimeout(() => load(filters), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [filters, load]);

  const loadMore = useCallback(() => {
    if (!nextBefore) return;
    setLoadingMore(true);
    listLogs(buildFilters(filters, nextBefore))
      .then(
        (page) => {
          setEntries((prev) => [...prev, ...page.items]);
          setNextBefore(page.nextBefore);
          mergeApps(page.items);
          setError(null);
        },
        (e) => setError((e as Error).message),
      )
      .finally(() => setLoadingMore(false));
  }, [filters, nextBefore, mergeApps]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <h1 className="text-xl font-semibold tracking-tight">Logs</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Log events shipped by your running deployments.
        </p>

        <div className="mt-6">
          <LogsFilters
            value={filters}
            apps={apps}
            onChange={setFilters}
            onRefresh={() => load(filters)}
            refreshing={loading}
          />
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-500">
            {error}
          </p>
        )}

        <div className="mt-4">
          {loading && entries.length === 0 ? (
            <p className="text-sm text-zinc-400">Loading logs…</p>
          ) : entries.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title={error ? "Logs unavailable" : "No logs found"}
              body={
                error
                  ? "The platform can't reach the log service. Set LOGS_URL to enable it."
                  : "No log events match these filters yet."
              }
            />
          ) : (
            <>
              <LogsTable entries={entries} />
              {nextBefore && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="rounded-md border border-black/10 px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-black/[0.04] disabled:opacity-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/[0.06]"
                  >
                    {loadingMore ? "Loading…" : "Load more"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
