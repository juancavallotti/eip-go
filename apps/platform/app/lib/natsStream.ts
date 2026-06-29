/**
 * Serve a NATS subject as a Server-Sent Events response: each message's payload
 * (already a JSON string) is relayed verbatim as a `data:` frame, with periodic
 * keep-alive comments so proxies hold the connection open. The subscription is torn
 * down when the request aborts or the stream is cancelled. Server-only.
 *
 * Shared by the deployment-status and integration-write SSE routes; both just relay
 * the published payload, so the browser parses a streamed frame exactly as before.
 */

import type { NatsConnection } from "./nats";

const KEEPALIVE_MS = 15000;

export function natsEventStream(
  nc: NatsConnection,
  subject: string,
  signal?: AbortSignal,
): Response {
  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const sub = nc.subscribe(subject);
      const ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keep-alive\n\n`));
        } catch {
          // Stream already closed — the teardown below clears this interval.
        }
      }, KEEPALIVE_MS);
      const close = () => {
        clearInterval(ping);
        sub.unsubscribe();
        try {
          controller.close();
        } catch {
          // Already closed — nothing to do.
        }
      };
      cleanup = close;
      // Relay each message until the subscription ends (unsubscribe / drain).
      (async () => {
        for await (const m of sub) {
          controller.enqueue(encoder.encode(`data: ${m.string()}\n\n`));
        }
      })()
        .catch(() => {})
        .finally(close);
      signal?.addEventListener("abort", close);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
