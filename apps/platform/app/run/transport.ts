/**
 * The platform transport: talks to the editor's BFF run routes under `/api/run`
 * and streams logs over SSE. Implements the editor's RunTransport contract so the
 * shared RunProvider can drive it.
 */

import type { RunStatusSnapshot, RunTransport } from "@octo/editor";

interface RunStatusResponse {
  available: boolean;
  running: boolean;
  version: string | null;
  testPath: string | null;
}

export const bffRunTransport: RunTransport = {
  async status(): Promise<RunStatusSnapshot> {
    const r = await fetch("/api/run");
    return (await r.json()) as RunStatusResponse;
  },

  async start({ yaml, devEnv }): Promise<RunStatusSnapshot> {
    const res = await fetch("/api/run/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ yaml, devEnv }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body.error ?? `start failed (${res.status})`);
    }
    return body as RunStatusResponse;
  },

  async stop() {
    await fetch("/api/run/stop", { method: "POST" });
  },

  async sync({ yaml }) {
    await fetch("/api/run/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ yaml }),
    });
  },

  subscribeLogs(onLine) {
    const es = new EventSource("/api/run/logs");
    es.onmessage = (ev) => {
      const seq = Number(ev.lastEventId);
      onLine(seq, ev.data);
    };
    return () => es.close();
  },
};
