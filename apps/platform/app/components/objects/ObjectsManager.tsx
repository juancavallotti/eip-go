"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Database, FolderTree, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { useConfirm } from "@/app/components/ConfirmDialog";
import { useOrchestrator } from "@/app/run/OrchestratorContext";
import {
  listAllDeployments,
  type DeploymentWithIntegration,
} from "@/app/model/orchestrator";
import {
  deleteObject,
  getObject,
  listObjects,
  setObject,
} from "@/app/model/objects";
import { EmptyState } from "@/app/(session)/platform/DashboardTiles";
import { initState, reducer } from "./state";

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

/** A readable label for a deployment in the picker. */
function deploymentLabel(d: DeploymentWithIntegration): string {
  return `${d.integrationName}${d.tag ? ` · ${d.tag}` : ""} (${d.status})`;
}

/**
 * The object store browser (`/platform/objects`): pick a deployment, list the keys
 * it holds in the user-facing object namespace, and view / edit / create / delete
 * their values. The selected deployment and key are mirrored to the URL so a
 * specific object is bookmarkable. Writes use the stored version for optimistic
 * concurrency; a stale write surfaces the orchestrator's conflict. The interlinked
 * selection/editing state lives in a reducer (./state); this component owns the
 * fetching and URL sync.
 */
export default function ObjectsManager() {
  const { available, ready } = useOrchestrator();
  const confirm = useConfirm();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [deployments, setDeployments] = useState<
    DeploymentWithIntegration[] | null
  >(null);
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    initState(searchParams.get("deployment"), searchParams.get("key")),
  );
  const {
    deploymentId,
    entries,
    selectedKey,
    current,
    draft,
    creating,
    newKey,
    busy,
    error,
  } = state;

  // Guards a slower value fetch from overwriting a newer selection.
  const valueSeq = useRef(0);

  /** Mirror the current selection into the URL (bookmarkable, no navigation). */
  const writeUrl = useCallback(
    (dep: string | null, key: string | null) => {
      const p = new URLSearchParams();
      if (dep) p.set("deployment", dep);
      if (key) p.set("key", key);
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  // Load the deployment list once the orchestrator is reachable.
  useEffect(() => {
    if (!available) return;
    listAllDeployments().then(
      (ds) => setDeployments(ds),
      (e) => dispatch({ type: "error", error: (e as Error).message }),
    );
  }, [available]);

  const loadEntries = useCallback(
    (dep: string) =>
      listObjects(dep).then(
        (items) => dispatch({ type: "entriesLoaded", entries: items }),
        (e) => {
          dispatch({ type: "entriesLoaded", entries: [] });
          dispatch({ type: "error", error: (e as Error).message });
        },
      ),
    [],
  );

  // (Re)load the key list whenever the selected deployment changes.
  useEffect(() => {
    if (!available || !deploymentId) return;
    loadEntries(deploymentId);
  }, [available, deploymentId, loadEntries]);

  // Load the selected key's value (and version), guarding against races.
  useEffect(() => {
    if (!deploymentId || !selectedKey) return;
    const seq = ++valueSeq.current;
    getObject(deploymentId, selectedKey).then(
      (v) => {
        if (seq === valueSeq.current) dispatch({ type: "valueLoaded", value: v });
      },
      (e) => {
        if (seq === valueSeq.current)
          dispatch({ type: "error", error: (e as Error).message });
      },
    );
  }, [deploymentId, selectedKey]);

  const selectDeployment = useCallback(
    (dep: string) => {
      dispatch({ type: "selectDeployment", deploymentId: dep || null });
      writeUrl(dep || null, null);
    },
    [writeUrl],
  );

  const selectKey = useCallback(
    (key: string) => {
      dispatch({ type: "selectKey", key });
      writeUrl(deploymentId, key);
    },
    [deploymentId, writeUrl],
  );

  const startCreate = useCallback(() => {
    dispatch({ type: "startCreate" });
    writeUrl(deploymentId, null);
  }, [deploymentId, writeUrl]);

  // The value is binary (returned base64); show it read-only rather than risk a
  // lossy text edit.
  const binary = current?.encoding === "base64";
  const dirty = current != null && !binary && draft !== current.value;

  const save = useCallback(async () => {
    if (!deploymentId) return;
    dispatch({ type: "busy" });
    try {
      if (creating) {
        const key = newKey.trim();
        if (!key) return dispatch({ type: "cancelCreate" });
        await setObject(deploymentId, key, draft, 0);
        await loadEntries(deploymentId);
        dispatch({ type: "created", key });
        writeUrl(deploymentId, key);
      } else if (current) {
        const version = await setObject(
          deploymentId,
          current.key,
          draft,
          current.version,
        );
        dispatch({ type: "saved", current: { ...current, value: draft, version } });
        await loadEntries(deploymentId);
      }
    } catch (e) {
      dispatch({ type: "error", error: (e as Error).message });
    }
  }, [creating, current, deploymentId, draft, loadEntries, newKey, writeUrl]);

  const remove = useCallback(async () => {
    if (!deploymentId || !current) return;
    const ok = await confirm({
      title: `Delete "${current.key}"?`,
      body: "This permanently removes the object from this deployment.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    dispatch({ type: "busy" });
    try {
      await deleteObject(deploymentId, current.key, current.version);
      await loadEntries(deploymentId);
      dispatch({ type: "deleted" });
      writeUrl(deploymentId, null);
    } catch (e) {
      dispatch({ type: "error", error: (e as Error).message });
    }
  }, [confirm, current, deploymentId, loadEntries, writeUrl]);

  const sortedDeployments = useMemo(
    () =>
      [...(deployments ?? [])].sort((a, b) =>
        deploymentLabel(a).localeCompare(deploymentLabel(b)),
      ),
    [deployments],
  );

  if (!ready) return null;
  if (!available) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8">
        <EmptyState
          icon={FolderTree}
          title="Object store unavailable"
          body="Set ORCHESTRATOR_URL to connect this editor to a cluster."
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Deployment picker + refresh */}
      <div className="flex items-center gap-2 border-b border-black/10 px-4 py-2.5 dark:border-white/10">
        <Database size={15} className="shrink-0 text-zinc-400" />
        <select
          value={deploymentId ?? ""}
          onChange={(e) => selectDeployment(e.target.value)}
          className="min-w-0 max-w-md flex-1 rounded-md border border-black/10 bg-transparent px-2 py-1 text-sm dark:border-white/15"
        >
          <option value="">Select a deployment…</option>
          {sortedDeployments.map((d) => (
            <option key={d.id} value={d.id}>
              {deploymentLabel(d)}
            </option>
          ))}
        </select>
        {deploymentId && (
          <button
            type="button"
            onClick={() => loadEntries(deploymentId)}
            aria-label="Refresh objects"
            className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-black/[0.05] hover:text-zinc-700 dark:hover:bg-white/[0.06] dark:hover:text-zinc-200"
          >
            <RefreshCw size={14} />
          </button>
        )}
      </div>

      {error && (
        <p className="mx-4 mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-500">
          {error}
        </p>
      )}

      {!deploymentId ? (
        <div className="px-6 py-8">
          <EmptyState
            icon={Database}
            title="Pick a deployment"
            body="Choose a deployment to browse the objects it holds in the user namespace."
          />
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[18rem_1fr]">
          {/* Key list */}
          <aside className="flex min-h-0 flex-col border-r border-black/10 dark:border-white/10">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Keys{entries ? ` (${entries.length})` : ""}
              </span>
              <button
                type="button"
                onClick={startCreate}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-sky-600 transition-colors hover:bg-sky-500/10 dark:text-sky-400"
              >
                <Plus size={13} />
                New
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
              {entries === null ? (
                <p className="px-2 py-2 text-sm text-zinc-400">Loading…</p>
              ) : entries.length === 0 ? (
                <p className="px-2 py-2 text-sm text-zinc-400">No objects yet.</p>
              ) : (
                entries.map((e) => {
                  const age = relativeAge(e.updatedAt);
                  return (
                    <button
                      key={e.key}
                      type="button"
                      onClick={() => selectKey(e.key)}
                      className={`flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left transition-colors ${
                        e.key === selectedKey
                          ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
                          : "hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                      }`}
                    >
                      <span className="truncate font-mono text-xs">{e.key}</span>
                      <span className="text-[11px] text-zinc-400">
                        {e.size} B · v{e.version}
                        {age ? ` · ${age}` : ""}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* Detail / editor */}
          <section className="flex min-h-0 flex-col overflow-y-auto">
            {creating ? (
              <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
                <input
                  autoFocus
                  value={newKey}
                  onChange={(e) => dispatch({ type: "setNewKey", value: e.target.value })}
                  placeholder="key (may contain slashes)"
                  className="rounded-md border border-black/10 bg-transparent px-2.5 py-1.5 font-mono text-sm dark:border-white/15"
                />
                <textarea
                  value={draft}
                  onChange={(e) => dispatch({ type: "setDraft", value: e.target.value })}
                  placeholder="value"
                  className="min-h-0 flex-1 resize-none rounded-md border border-black/10 bg-transparent p-3 font-mono text-sm dark:border-white/15"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "cancelCreate" })}
                    className="rounded-md px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-black/[0.06] dark:text-zinc-300 dark:hover:bg-white/[0.08]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={save}
                    disabled={busy || !newKey.trim()}
                    className="inline-flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-sky-500 disabled:opacity-50"
                  >
                    <Save size={14} />
                    Create
                  </button>
                </div>
              </div>
            ) : current ? (
              <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
                <div className="flex items-center gap-2">
                  <h2 className="min-w-0 flex-1 truncate font-mono text-sm font-semibold">
                    {current.key}
                  </h2>
                  <span className="shrink-0 text-xs text-zinc-400">
                    v{current.version}
                  </span>
                  <button
                    type="button"
                    onClick={remove}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-md border border-red-500/30 px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400"
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </div>

                {binary && (
                  <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                    Binary value (shown base64-encoded, read-only).
                  </p>
                )}

                <textarea
                  value={draft}
                  onChange={(e) => dispatch({ type: "setDraft", value: e.target.value })}
                  readOnly={binary}
                  spellCheck={false}
                  className="min-h-0 flex-1 resize-none rounded-md border border-black/10 bg-transparent p-3 font-mono text-sm read-only:opacity-70 dark:border-white/15"
                />

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={save}
                    disabled={busy || !dirty}
                    className="inline-flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-sky-500 disabled:opacity-50"
                  >
                    <Save size={14} />
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-6 py-8">
                <EmptyState
                  icon={Database}
                  title="No object selected"
                  body="Select a key on the left to view its value, or create a new one."
                />
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
