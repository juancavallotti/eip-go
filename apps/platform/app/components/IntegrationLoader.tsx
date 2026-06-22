"use client";

import { useEffect } from "react";
import { useEditorState, EditorActionType } from "@/app/state/editorState";
import { useFileSystem } from "@/app/providers/FileSystemProvider";
import { fromDefinitionYaml } from "@/app/model/runConfig";

/**
 * Loads the document named by the `/i/[id]` route into the editor via the
 * filesystem capability. The id lives in the path (not a query string) so the
 * URL is bookmarkable and survives a refresh. Renders nothing; does nothing when
 * no id is present or no filesystem capability is provided.
 */
export default function IntegrationLoader({
  integrationId,
}: {
  integrationId?: string;
}) {
  const { dispatch } = useEditorState();
  const fs = useFileSystem();

  useEffect(() => {
    if (!integrationId || !fs) return;
    let cancelled = false;
    fs.load(integrationId)
      .then((stored) => {
        if (cancelled) return;
        dispatch({
          type: EditorActionType.LOAD_INTEGRATION,
          data: {
            id: stored.id,
            name: stored.name,
            folderId: stored.folderId ?? null,
            document: fromDefinitionYaml(stored.definition),
          },
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [integrationId, dispatch, fs]);

  return null;
}
