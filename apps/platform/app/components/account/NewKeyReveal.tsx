"use client";

import { useState } from "react";
import { Check, Copy, X } from "lucide-react";
import type { CreatedApiKey } from "@/app/model/apikeys";

/**
 * The one-time reveal of a freshly created key's secret token. The plaintext is
 * shown only here, immediately after creation, and is unrecoverable afterwards —
 * so the panel is prominent, offers a copy button, and warns the user to store it
 * now. Dismissing it clears the token from the page.
 */
export default function NewKeyReveal({
  created,
  onDismiss,
}: {
  created: CreatedApiKey;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(created.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied; the token is selectable in the field.
    }
  };

  return (
    <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
        Key “{created.name}” created
      </p>
      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
        Copy it now — this is the only time the full token is shown.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <input
          readOnly
          value={created.token}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-md border border-black/10 bg-transparent px-2 py-1 font-mono text-sm outline-none dark:border-white/15"
        />
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
