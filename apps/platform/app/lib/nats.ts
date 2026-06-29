/**
 * Server-only NATS connection for the BFF. The orchestrator publishes deployment
 * snapshots and the MCP store adapter publishes integration-write events to NATS;
 * the SSE routes here subscribe and relay them to browsers (issue #74). A single
 * lazily-opened connection is shared across requests.
 *
 * Returns null when NATS_URL is unset or the broker is unreachable, so callers can
 * fall back (poll the REST list, or the in-process @octo/events bus) — the
 * standalone app and local dev run with no broker.
 */

import { connect } from "@nats-io/transport-node";

export type NatsConnection = Awaited<ReturnType<typeof connect>>;

let connPromise: Promise<NatsConnection | null> | null = null;

/** Lazily connect to NATS (cached). null when unconfigured or unreachable. */
export function getNats(): Promise<NatsConnection | null> {
  const url = process.env.NATS_URL;
  if (!url) return Promise.resolve(null);
  if (!connPromise) {
    connPromise = connect({ servers: url, name: "octo-platform" }).catch((err) => {
      console.error("nats connect failed", err);
      connPromise = null; // let a later request retry the connection
      return null;
    });
  }
  return connPromise;
}

/** The subject an integration's deployment snapshots are published on. Must match
 *  the orchestrator's deployment.DeploymentsSubject. Internal infra subjects are
 *  namespaced under "internal." (like the runtime's internal.logs). */
export const deploymentsSubject = (integrationId: string): string =>
  `internal.deployments.${integrationId}`;

/** The subject integration-write (create/update) events are published on. */
export const INTEGRATION_EVENTS_SUBJECT = "internal.integrations.events";
