/**
 * Publish an integration-write event (create/update) so an editor with that file
 * open can live-reload it. Uses NATS when configured so the hint fans out across
 * BFF replicas (issue #74.2); otherwise the in-process @octo/events bus, which
 * reaches editors on the same process (local dev / single replica). Server-only.
 *
 * Fire-and-forget by contract: the MCP write must never fail because the reload
 * hint couldn't be delivered, so this swallows its own errors.
 */

import { publish as publishInProcess, type OctoEvent } from "@octo/events";
import { getNats, INTEGRATION_EVENTS_SUBJECT } from "./nats";

export async function publishIntegrationEvent(event: OctoEvent): Promise<void> {
  try {
    const nc = await getNats();
    if (nc) {
      nc.publish(INTEGRATION_EVENTS_SUBJECT, JSON.stringify(event));
      return;
    }
    publishInProcess(event);
  } catch (err) {
    console.error("publish integration event failed", err);
  }
}
