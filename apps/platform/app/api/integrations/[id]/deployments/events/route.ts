import { deploymentsSubject, getNats } from "@/app/lib/nats";
import { natsEventStream } from "@/app/lib/natsStream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/integrations/:id/deployments/events — Server-Sent Events stream of the
 * integration's deployment list. The orchestrator publishes each snapshot to NATS
 * (octo.deployments.{id}); we subscribe and relay it to the browser EventSource
 * (issue #74). 503 when NATS is unconfigured, so the client falls back to polling
 * the REST list (DeploymentsSection's existing onerror path).
 */
export async function GET(req: Request, { params }: Params) {
  const { id } = await params;
  const nc = await getNats();
  if (!nc) {
    return Response.json(
      { error: "live updates unavailable (NATS_URL unset)" },
      { status: 503 },
    );
  }
  return natsEventStream(nc, deploymentsSubject(id), req.signal);
}
