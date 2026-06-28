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

/**
 * A queue destination: a subject that one or more clients consume from, derived
 * from the broker's per-subscription detail. The platform scopes its queues as
 * `octo.<deployment>.q.<name>` and queue-subscribes on that same string, so for
 * platform queues `name`/`deployment` carry the readable parts and `queue` is set;
 * other (non-internal) subjects pass through with `name` = the raw subject. The
 * consuming connections (with their full stats) hang off `connections`, revealed
 * when the destination is expanded.
 */
export interface QueueDestination {
  /** The raw NATS subject (and, for platform queues, the queue-group name). */
  subject: string;
  /** Queue-group name when this is a load-balanced queue, else null. */
  queue: string | null;
  /** Deployment id parsed from a platform queue subject, else null. */
  deployment: string | null;
  /** Readable queue name (the user subject) for platform queues, else the subject. */
  name: string;
  /** Total subscriptions on this destination across all connections. */
  subscribers: number;
  /** Total messages delivered across those subscriptions. */
  msgs: number;
  /** The connections consuming from this destination, with their full stats. */
  connections: QueueConnection[];
}

/**
 * A single monitoring snapshot: broker totals and the queue destinations clients
 * consume from (each carrying its consuming connections).
 */
export interface QueueStats {
  server: QueueServerStats;
  destinations: QueueDestination[];
}

/** Fetch a fresh broker snapshot (broker totals + open connections). */
export async function listQueueStats(): Promise<QueueStats> {
  return unwrap(await queueActions.listQueueStats());
}
