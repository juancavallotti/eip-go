"use client";

import type { QueueConnection } from "@/app/model/queues";

/** Group digits for readability; counts and byte values can run large. */
export function num(n: number): string {
  return n.toLocaleString();
}

/** Humanize a byte count (1024-based) to a compact, readable string. */
export function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ["KiB", "MiB", "GiB", "TiB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

/** One headline counter tile. */
export function Stat({
  label,
  value,
  alert,
}: {
  label: string;
  value: string;
  /** Render the value in the alert color (e.g. nonzero slow consumers). */
  alert?: boolean;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white/40 p-4 dark:border-white/10 dark:bg-zinc-900/30">
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
      <div
        className={`mt-1 text-lg font-semibold tabular-nums ${
          alert ? "text-red-500" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

/** The per-connection breakdown table. */
export function ConnectionsTable({
  connections,
}: {
  connections: QueueConnection[];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-zinc-400 dark:border-white/10">
            <th className="px-3 py-2 font-medium">CID</th>
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-3 py-2 text-right font-medium">Subs</th>
            <th className="px-3 py-2 text-right font-medium">Pending</th>
            <th className="px-3 py-2 text-right font-medium">Msgs in</th>
            <th className="px-3 py-2 text-right font-medium">Msgs out</th>
            <th className="px-3 py-2 text-right font-medium">Data in</th>
            <th className="px-3 py-2 text-right font-medium">Data out</th>
          </tr>
        </thead>
        <tbody>
          {connections.map((c) => (
            <tr
              key={c.cid}
              className="border-b border-black/5 last:border-0 dark:border-white/5"
            >
              <td className="px-3 py-2 tabular-nums text-zinc-500">{c.cid}</td>
              <td className="max-w-xs truncate px-3 py-2" title={c.name}>
                {c.name || <span className="text-zinc-400">—</span>}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {num(c.subscriptions)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {bytes(c.pending)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {num(c.inMsgs)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {num(c.outMsgs)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {bytes(c.inBytes)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {bytes(c.outBytes)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
