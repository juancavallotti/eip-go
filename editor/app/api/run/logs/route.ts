import { snapshot, subscribe, type LogLine } from "../session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** How often to send an SSE comment so proxies keep the connection open. */
const KEEPALIVE_MS = 15000;

/**
 * GET /api/run/logs — Server-Sent Events stream of runner log lines. On connect it
 * replays the buffered lines, then streams new ones live until the client
 * disconnects (which cancels the stream and unsubscribes).
 */
export function GET() {
  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const send = (line: LogLine) => {
        controller.enqueue(
          encoder.encode(`id: ${line.seq}\ndata: ${line.text}\n\n`),
        );
      };
      for (const line of snapshot()) send(line);
      const unsubscribe = subscribe(send);
      const ping = setInterval(() => {
        controller.enqueue(encoder.encode(`: keep-alive\n\n`));
      }, KEEPALIVE_MS);
      cleanup = () => {
        clearInterval(ping);
        unsubscribe();
      };
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
