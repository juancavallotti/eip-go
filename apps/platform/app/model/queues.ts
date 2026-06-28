/**
 * Browser-side client for platform queue (NATS broker) monitoring. Backed by the
 * `listQueueStats` server action, which reads the NATS monitoring HTTP endpoints
 * directly; this wrapper unwraps the ActionResult so callers keep a value-or-throw
 * contract. Read-only: there is nothing to mutate here, just a periodic snapshot
 * the /platform/queues view polls.
 */

import * as queueActions from "@/app/actions/queues";
import { unwrap } from "./bff";

/** Broker-wide counters, sourced from the NATS monitoring `/varz` endpoint. */
export interface QueueServerStats {
  serverName: string;
  version: string;
  /** RFC3339 timestamp of when the broker produced this snapshot. */
  now: string;
  /** Human-readable broker uptime, e.g. "1h2m3s". */
  uptime: string;
  /** Currently open client connections. */
  connections: number;
  /** Connections accepted over the broker's lifetime. */
  totalConnections: number;
  inMsgs: number;
  outMsgs: number;
  inBytes: number;
  outBytes: number;
  /** Clients dropped for failing to keep up — a health red flag when nonzero. */
  slowConsumers: number;
  /** Active subscriptions across all connections. */
  subscriptions: number;
}

/** One client connection, sourced from the NATS monitoring `/connz` endpoint. */
export interface QueueConnection {
  cid: number;
  /** Client-supplied name (the runtime tags its connections "octo-runtime <id>"). */
  name: string;
  subscriptions: number;
  /** Bytes queued for delivery to this client. */
  pending: number;
  inMsgs: number;
  outMsgs: number;
  inBytes: number;
  outBytes: number;
}

/** A single monitoring snapshot: broker totals plus the per-connection breakdown. */
export interface QueueStats {
  server: QueueServerStats;
  connections: QueueConnection[];
}

/** Fetch a fresh broker snapshot (broker totals + open connections). */
export async function listQueueStats(): Promise<QueueStats> {
  return unwrap(await queueActions.listQueueStats());
}
