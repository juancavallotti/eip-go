"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FolderTree, RefreshCw } from "lucide-react";
import { useOrchestrator } from "@/app/run/OrchestratorContext";
import { listAllDeployments } from "@/app/model/orchestrator";
import {
  DeploymentTile,
  EmptyState,
  type DeployedTile,
} from "@/app/(session)/platform/DashboardTiles";

/**
 * The deployments view: every active deployment across every integration, with
 * live status (polled while the page is open). Reuses the dashboard's aggregation
 * (listAllDeployments) and tile so the standalone page and the dashboard summary
 * stay in sync. The grid is the same DeploymentTile, whose corner actions open the
 * integration in the manager or the editor.
 */
export default function DeploymentsMonitor() {
  const { available, ready } = useOrchestrator();
  const [deployments, setDeployments] = useState<DeployedTile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch without touching the spinner flag, so it's safe to call from the effect.
  const load = useCallback(
    () =>
      listAllDeployments().then(
        (ds) => {
          setDeployments(ds);
          setError(null);
        },
        (e) => setError((e as Error).message),
      ),
    [],
  );

  const refresh = useCallback(() => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }, [load]);

  // Initial load plus light polling so deployment status stays current.
  useEffect(() => {
    if (!available) return;
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [available, load]);

  const sorted = useMemo(
    () =>
      [...(deployments ?? [])].sort((a, b) =>
        a.integrationName.localeCompare(b.integrationName),
      ),
    [deployments],
  );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">Deployments</h1>
          {sorted.length > 0 && (
            <span className="rounded-full bg-black/[0.06] px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-white/[0.08] dark:text-zinc-400">
              {sorted.length}
            </span>
          )}
          {available && (
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              aria-label="Refresh deployments"
              className="ml-1 rounded-md p-1 text-zinc-400 transition-colors hover:bg-black/[0.05] hover:text-zinc-700 disabled:opacity-50 dark:hover:bg-white/[0.06] dark:hover:text-zinc-200"
            >
              <RefreshCw
                size={14}
                className={refreshing ? "animate-spin" : undefined}
              />
            </button>
          )}
        </div>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Every active deployment across your integrations, with live status.
        </p>

        {error && (
          <p className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-500">
            {error}
          </p>
        )}

        <div className="mt-6">
          {!ready ? null : !available ? (
            <EmptyState
              icon={FolderTree}
              title="Deployments unavailable"
              body="Set ORCHESTRATOR_URL to connect this editor to a cluster."
            />
          ) : deployments === null ? (
            <p className="text-sm text-zinc-400">Loading deployments…</p>
          ) : sorted.length === 0 ? (
            <EmptyState
              icon={FolderTree}
              title="No deployments yet"
              body="Deploy an integration and it will show up here with live status."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sorted.map((d) => (
                <DeploymentTile key={d.id} d={d} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
