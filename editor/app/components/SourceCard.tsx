"use client";

import { Webhook } from "lucide-react";
import type { SourceNode } from "@/app/model/document";

/**
 * The source card sits at the top of a flow. It shows the flow's source
 * (connector + type) read-only for now — a source picker lands with the settings
 * editor.
 */
export default function SourceCard({ source }: { source?: SourceNode }) {
  const label = source?.type
    ? `${source.type}${source.connector ? ` · ${source.connector}` : ""}`
    : "No source — this flow is callable by name";

  return (
    <div className="rounded-lg border border-dashed border-black/15 dark:border-white/20 bg-white/40 dark:bg-white/5 px-3 py-2 flex items-center gap-3">
      <Webhook size={18} className="text-zinc-500 shrink-0" />
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wide text-zinc-500">Source</div>
        <div className="text-sm truncate">{label}</div>
      </div>
    </div>
  );
}
