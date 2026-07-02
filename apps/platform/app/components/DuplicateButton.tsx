"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { useSave } from "@octo/editor";
import { createIntegration, getIntegration } from "@/app/model/orchestrator";

/**
 * Editor-header control that duplicates the current integration into a fresh
 * "Copy of …" record and opens the copy in the editor. Like {@link TagButton} it
 * saves first (so the copy captures what's on screen) and reads the authoritative
 * id from `getIntegrationId` — a ref the host updates on save — before cloning the
 * saved definition. Renders nothing without a filesystem capability, and is
 * disabled while there's nothing worth persisting yet (empty document).
 */
export default function DuplicateButton({
  getIntegrationId,
}: {
  getIntegrationId: () => string | null;
}) {
  const save = useSave();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  // No filesystem capability => nothing to duplicate (mirrors how Save hides).
  if (!save) return null;

  const duplicate = async () => {
    if (busy || save.empty) return;
    setBusy(true);
    try {
      // Save first so the copy captures the on-screen definition; on the first save
      // this mints the id we then read via the ref.
      await save.save();
      const id = getIntegrationId();
      if (!id) return;
      const source = await getIntegration(id);
      const created = await createIntegration({
        name: `Copy of ${source.name}`,
        definition: source.definition,
      });
      router.push(`/platform/i/${encodeURIComponent(created.id)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={duplicate}
      disabled={save.empty || busy}
      title={save.empty ? "Nothing to duplicate yet" : "Duplicate this integration"}
      className="inline-flex items-center gap-1.5 rounded-md border border-black/10 px-2.5 py-1 text-sm font-medium transition-colors hover:bg-black/[0.04] disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/[0.06]"
    >
      <Copy size={14} />
      {busy ? "Duplicating…" : "Duplicate"}
    </button>
  );
}
