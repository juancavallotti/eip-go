/**
 * The NATS monitoring client — the middle layer between the queues server action
 * and the `fetch` abstraction (`@octo/http`):
 *
 *     serverAction (auth) → this client (getQueueStats()) → requestJson() → fetch
 *
 * Unlike the orchestrator client, the platform talks to the broker's monitoring
 * HTTP service (port 8222) directly: it is in-cluster reachable and the data is a
 * read-only snapshot, so there is no reason to hop through the orchestrator. The
 * server-only `NATS_MONITOR_URL` and the snake_case→camelCase shaping are internal;
 * callers see only the curated {@link QueueStats}.
 */

import { requestJson, type ActionResult } from "@octo/http";
import type {
  QueueConnection,
  QueueServerStats,
  QueueStats,
} from "@/app/model/queues";

/** The subset of NATS `/varz` we surface (snake_case as the broker emits it). */
interface Varz {
  server_name: string;
  version: string;
  now: string;
  uptime: string;
  connections: number;
  total_connections: number;
  in_msgs: number;
  out_msgs: number;
  in_bytes: number;
  out_bytes: number;
  slow_consumers: number;
  subscriptions: number;
}

/** The subset of NATS `/connz` we surface. */
interface Connz {
  connections: Array<{
    cid: number;
    name?: string;
    subscriptions: number;
    pending_bytes: number;
    in_msgs: number;
    out_msgs: number;
    in_bytes: number;
    out_bytes: number;
  }>;
}

/** The monitoring base URL with any trailing slash trimmed, or "" when unset. */
function baseUrl(): string {
  return (process.env.NATS_MONITOR_URL ?? "").replace(/\/+$/, "");
}

function toServer(v: Varz): QueueServerStats {
  return {
    serverName: v.server_name,
    version: v.version,
    now: v.now,
    uptime: v.uptime,
    connections: v.connections,
    totalConnections: v.total_connections,
    inMsgs: v.in_msgs,
    outMsgs: v.out_msgs,
    inBytes: v.in_bytes,
    outBytes: v.out_bytes,
    slowConsumers: v.slow_consumers,
    subscriptions: v.subscriptions,
  };
}

function toConnections(c: Connz): QueueConnection[] {
  return c.connections.map((conn) => ({
    cid: conn.cid,
    name: conn.name ?? "",
    subscriptions: conn.subscriptions,
    pending: conn.pending_bytes,
    inMsgs: conn.in_msgs,
    outMsgs: conn.out_msgs,
    inBytes: conn.in_bytes,
    outBytes: conn.out_bytes,
  }));
}

/**
 * Pull a broker snapshot: `/varz` for the totals and `/connz` for the open
 * connections, fetched together. Returns an error result when monitoring is
 * unconfigured (`NATS_MONITOR_URL` unset) or either endpoint is unreachable.
 */
export async function getQueueStats(): Promise<ActionResult<QueueStats>> {
  const base = baseUrl();
  if (!base) {
    return {
      ok: false,
      error: "queue monitoring not configured (NATS_MONITOR_URL unset)",
    };
  }
  const [varz, connz] = await Promise.all([
    requestJson<Varz>("GET", `${base}/varz`),
    requestJson<Connz>("GET", `${base}/connz`),
  ]);
  if (!varz.ok) return varz;
  if (!connz.ok) return connz;
  return {
    ok: true,
    data: { server: toServer(varz.data), connections: toConnections(connz.data) },
  };
}
