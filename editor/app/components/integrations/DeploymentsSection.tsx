"use client";

import { useCallback, useEffect, useState } from "react";
import { Globe, Rocket } from "lucide-react";
import {
  createDeployment,
  deleteDeployment,
  listDeployments,
  type Deployment,
} from "@/app/model/orchestrator";
import DeploymentRow from "./DeploymentRow";

/**
 * Deployments for one integration: a one-click Deploy plus a list of live
 * deployments with their status and an Undeploy action. The orchestrator
 * refreshes each deployment's status from the cluster on read, so the list is
 * re-fetched on mount and on a light interval while shown — no client-side
 * status tracking. Mutations refresh immediately, mirroring IntegrationsManager.
 */

// Status is refreshed server-side on read; poll gently so pending->running shows.
const REFRESH_MS = 4000;

export default function DeploymentsSection({
  integrationId,
}: {
  integrationId: string;
}) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deploy options.
  const [replicas, setReplicas] = useState(1);
  const [expose, setExpose] = useState(false);
  const [subdomain, setSubdomain] = useState("");

  // A then-chain (not an async body) so the effect's call doesn't setState
  // synchronously — same shape as IntegrationsManager's refresh.
  const refresh = useCallback(
    () =>
      listDeployments(integrationId).then(
        (items) => {
          setDeployments(items);
          setError(null);
        },
        (e) => setError((e as Error).message),
      ),
    [integrationId],
  );

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  /** Run a mutation, then refresh; surface failures inline. */
  const run = useCallback(
    async (fn: () => Promise<unknown>) => {
      setBusy(true);
      setError(null);
      try {
        await fn();
        await refresh();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const deploy = () =>
    run(() =>
      createDeployment(integrationId, {
        replicas,
        ...(expose
          ? { expose: "external", subdomain: subdomain.trim() || undefined }
          : {}),
      }),
    );

  const undeploy = (d: Deployment) => {
    if (!confirm(`Undeploy "${d.name}" (${d.id.slice(0, 8)})?`)) return;
    run(() => deleteDeployment(d.id));
  };

  return (
    <>
      <div className="mb-2 flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-xs text-zinc-500">
          Replicas
          <input
            type="number"
            min={1}
            value={replicas}
            onChange={(e) =>
              setReplicas(Math.max(1, Number(e.target.value) || 1))
            }
            disabled={busy}
            className="mt-0.5 w-16 rounded-md border border-zinc-300 bg-transparent px-2 py-1 text-sm dark:border-zinc-700"
          />
        </label>

        <label className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={expose}
            onChange={(e) => setExpose(e.target.checked)}
            disabled={busy}
          />
          <Globe size={14} />
          Expose externally
        </label>

        {expose && (
          <label className="flex flex-col text-xs text-zinc-500">
            Subdomain
            <input
              type="text"
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value)}
              placeholder="defaults to name"
              disabled={busy}
              className="mt-0.5 w-40 rounded-md border border-zinc-300 bg-transparent px-2 py-1 text-sm dark:border-zinc-700"
            />
          </label>
        )}

        <button
          type="button"
          onClick={deploy}
          disabled={busy}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
        >
          <Rocket size={14} />
          Deploy
        </button>
      </div>

      {error && <p className="mb-2 text-sm text-red-500">{error}</p>}

      {deployments.length === 0 ? (
        <p className="text-sm text-zinc-400">Not deployed.</p>
      ) : (
        <ul className="space-y-1.5">
          {deployments.map((d) => (
            <DeploymentRow
              key={d.id}
              deployment={d}
              busy={busy}
              onUndeploy={undeploy}
            />
          ))}
        </ul>
      )}
    </>
  );
}
