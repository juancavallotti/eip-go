"use client";

import {
  AlertTriangle,
  Clock,
  ExternalLink,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type { Deployment, DeploymentStatus } from "@/app/model/orchestrator";

/**
 * One row in the deployments list: status badge, ready/desired replicas,
 * restarts, age, the external link or internal address, an Undeploy action, and
 * the failure reason when the deployment is failed. Split out of
 * DeploymentsSection to keep that component focused on data/actions.
 */

const STATUS_STYLES: Record<DeploymentStatus, string> = {
  running: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  failed: "bg-red-500/15 text-red-600 dark:text-red-400",
};

function StatusBadge({ status }: { status: DeploymentStatus }) {
  const cls = STATUS_STYLES[status] ?? "bg-zinc-500/15 text-zinc-500";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

/** Compact relative age (e.g. "3m", "2h", "5d") from an RFC3339 timestamp. */
function relativeAge(iso?: string): string | null {
  if (!iso) return null;
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (!Number.isFinite(secs) || secs < 0) return null;
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  return `${Math.floor(secs / 86400)}d`;
}

/** Total container restarts across a deployment's pods. */
function totalRestarts(d: Deployment): number {
  return (d.pods ?? []).reduce((sum, p) => sum + p.restarts, 0);
}

export default function DeploymentRow({
  deployment: d,
  busy,
  onUndeploy,
}: {
  deployment: Deployment;
  busy: boolean;
  onUndeploy: (d: Deployment) => void;
}) {
  const age = relativeAge(d.createdAt);
  const restarts = totalRestarts(d);
  const desired = d.desiredReplicas || d.replicas;

  return (
    <li className="flex flex-col gap-0.5 py-0.5 text-sm" title={d.id}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-zinc-500">
          {d.id.slice(0, 8)}
        </span>
        <StatusBadge status={d.status} />
        <span className="text-xs text-zinc-400" title="Ready / desired replicas">
          {d.readyReplicas}/{desired} ready
        </span>
        {restarts > 0 && (
          <span
            className="inline-flex items-center gap-0.5 text-xs text-amber-600 dark:text-amber-400"
            title="Container restarts"
          >
            <RotateCcw size={11} />
            {restarts}
          </span>
        )}
        {age && (
          <span
            className="inline-flex items-center gap-0.5 text-xs text-zinc-400"
            title="Age"
          >
            <Clock size={11} />
            {age}
          </span>
        )}
        {d.externalUrl ? (
          <a
            href={d.externalUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-sky-600 hover:underline dark:text-sky-400"
          >
            <ExternalLink size={12} />
            {d.externalUrl.replace(/^https?:\/\//, "")}
          </a>
        ) : (
          d.internalUrl && (
            <span
              className="font-mono text-xs text-zinc-400"
              title="Internal cluster address"
            >
              {d.internalUrl.replace(/^https?:\/\//, "")}
            </span>
          )
        )}
        <button
          type="button"
          onClick={() => onUndeploy(d)}
          disabled={busy}
          aria-label="Undeploy"
          className="ml-auto rounded-md p-1 text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
        >
          <Trash2 size={14} />
        </button>
      </div>
      {d.reason && (
        <span className="inline-flex items-center gap-1 text-xs text-red-500">
          <AlertTriangle size={11} />
          {d.reason}
        </span>
      )}
    </li>
  );
}
