"use client";

import { useEditorState } from "@/app/state/editorState";
import { findPaletteComponent } from "./palette";

/**
 * Canvas is the main flow-drawing area: an empty dot-grid placeholder for now.
 * It reads the current selection from the editor reducer to show a hint.
 *
 * TODO: replace this with a real flow graph (likely @xyflow/react / React Flow)
 * once the node/edge model is decided.
 */
export default function Canvas() {
  const { state } = useEditorState();
  const selected = findPaletteComponent(state.selectedComponentId);

  return (
    <main className="relative flex-1 min-w-0 canvas-grid">
      <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none">
        <p className="text-sm text-zinc-500 text-center">
          {selected
            ? `“${selected.label}” selected — drag onto the canvas to add it`
            : "Drag components here to build your flow"}
        </p>
      </div>
    </main>
  );
}
