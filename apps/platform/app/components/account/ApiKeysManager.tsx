"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useConfirm } from "@/app/components/ConfirmDialog";
import {
  createApiKey,
  deleteApiKey,
  listApiKeys,
  type ApiKey,
  type CreatedApiKey,
} from "@/app/model/apikeys";
import ApiKeyRow from "./ApiKeyRow";
import NewKeyReveal from "./NewKeyReveal";

/**
 * Per-user API-key management. Keys authenticate machine clients (the MCP
 * endpoint) as the signed-in user via a bearer token. The full token is shown
 * exactly once, right after creation (see NewKeyReveal); the list only ever shows
 * a key's label, its non-secret prefix…last4 fragment, and its expiry.
 *
 * Owns its own load/refresh/error state, mirroring SecretsManager's `run()` pattern.
 */

const INPUT =
  "rounded-md border border-black/10 dark:border-white/15 bg-transparent px-2 py-1 text-sm outline-none focus:border-black/30 dark:focus:border-white/30";

const DAY = 86_400;
const TTL_OPTIONS = [
  { label: "7 days", seconds: 7 * DAY },
  { label: "30 days", seconds: 30 * DAY },
  { label: "90 days", seconds: 90 * DAY },
  { label: "365 days", seconds: 365 * DAY },
];

export default function ApiKeysManager() {
  const confirm = useConfirm();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [ttl, setTtl] = useState(TTL_OPTIONS[1].seconds);
  const [created, setCreated] = useState<CreatedApiKey | null>(null);
  // Reference time for the "expired" badge, sampled when the list loads (reading
  // the clock during render is impure). 0 until the first load completes.
  const [now, setNow] = useState(0);

  const refresh = useCallback(
    () =>
      listApiKeys().then(
        (ks) => {
          setKeys(ks);
          setNow(Date.now());
        },
        (e) => setError((e as Error).message),
      ),
    [],
  );

  useEffect(() => {
    refresh();
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

  const canAdd = !busy && name.trim().length > 0;

  const add = () => {
    if (!canAdd) return;
    run(async () => {
      const key = await createApiKey(name.trim(), ttl);
      setCreated(key);
      setName("");
    });
  };

  const remove = async (id: string) => {
    const target = keys.find((k) => k.id === id);
    const ok = await confirm({
      title: `Delete key "${target?.name ?? id}"?`,
      body: "Any client using this key will stop working immediately.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    run(() => deleteApiKey(id));
  };

  return (
    <div className="flex h-full flex-col px-6 py-5">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-xl font-semibold tracking-tight">API keys</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Personal bearer tokens for authenticating to the MCP endpoint. Send one
          as <code className="font-mono">Authorization: Bearer &lt;token&gt;</code>.
          The full token is shown only once, when you create it.
        </p>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        {/* Create a key */}
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-black/10 p-3 dark:border-white/10">
          <input
            value={name}
            disabled={busy}
            placeholder="Key name (e.g. laptop, ci)"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            className={`${INPUT} min-w-[12rem] flex-1`}
          />
          <select
            value={ttl}
            disabled={busy}
            onChange={(e) => setTtl(Number(e.target.value))}
            aria-label="Expiration"
            className={INPUT}
          >
            {TTL_OPTIONS.map((o) => (
              <option key={o.seconds} value={o.seconds}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={add}
            disabled={!canAdd}
            className="inline-flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-sky-500 disabled:opacity-50"
          >
            <Plus size={14} />
            Create
          </button>
        </div>

        {created && (
          <NewKeyReveal created={created} onDismiss={() => setCreated(null)} />
        )}

        {/* Existing keys */}
        <div className="mt-4 flex flex-col gap-1.5">
          {keys.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-zinc-400">
              No API keys yet.
            </p>
          ) : (
            keys.map((k) => (
              <ApiKeyRow
                key={k.id}
                apiKey={k}
                now={now}
                busy={busy}
                onDelete={remove}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
