import { integrationEventStream } from "@octo/events";
import { getNats, INTEGRATION_EVENTS_SUBJECT } from "@/app/lib/nats";
import { natsEventStream } from "@/app/lib/natsStream";

/**
 * GET /api/integrations/events — Server-Sent Events stream of integration-write
 * events. The MCP store adapter publishes when it creates/updates an integration;
 * the editor subscribes here and live-reloads the file it has open. Gated by the
 * OIDC session like other /api/* routes (the proxy 401s unauthenticated callers).
 *
 * Uses NATS when configured so a write handled by any BFF replica reaches editors
 * on every replica (issue #74.2); otherwise the in-process @octo/events bus, which
 * reaches editors on the same process (local dev / single replica).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const nc = await getNats();
  if (nc) return natsEventStream(nc, INTEGRATION_EVENTS_SUBJECT, req.signal);
  return integrationEventStream(req.signal);
}
