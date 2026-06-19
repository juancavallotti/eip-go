"use client";

import { createElement, useState } from "react";
import { X } from "lucide-react";
import { findBlock, isSlotField } from "@/app/model/document";
import { getBlockSpec, resolveIcon } from "@/app/schema";
import { useEditorState, EditorActionType } from "@/app/state/editorState";
import SettingsField from "./SettingsField";

const MIN_WIDTH = 280;
const MAX_WIDTH = 560;
const DEFAULT_WIDTH = 340;

/**
 * Docked settings panel on the right edge. When a canvas block is selected it
 * shows that block's editable (non-slot) settings, driven by the capability
 * schema; edits dispatch back into the editor document. The panel width is
 * locally adjustable by dragging its left divider (plain pointer events — kept
 * out of the canvas DndContext on purpose).
 */
export default function SettingsPanel() {
  const { state, dispatch } = useEditorState();
  const [width, setWidth] = useState(DEFAULT_WIDTH);

  const block = state.selectedBlockId
    ? findBlock(state.document, state.selectedBlockId)
    : undefined;
  const spec = block ? getBlockSpec(block.type) : undefined;

  function startResize(e: React.PointerEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;
    const onMove = (ev: PointerEvent) => {
      // Dragging the left edge leftwards widens the panel.
      const next = startWidth + (startX - ev.clientX);
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, next)));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <aside
      style={{ width }}
      className="relative shrink-0 border-l border-black/10 dark:border-white/10 flex flex-col"
    >
      {/* Resize divider */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize settings panel"
        onPointerDown={startResize}
        className="absolute inset-y-0 left-0 w-1.5 -translate-x-1/2 cursor-col-resize hover:bg-sky-400/40"
      />

      {!block || !spec ? (
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-zinc-400 dark:text-zinc-500">
          Select a component to edit its settings.
        </div>
      ) : (
        <>
          <header className="flex items-center gap-2 border-b border-black/10 dark:border-white/10 px-4 h-12 shrink-0">
            {createElement(resolveIcon(spec.icon), {
              size: 18,
              className: "text-zinc-500 shrink-0",
            })}
            <span className="font-semibold tracking-tight truncate">
              {spec.label}
            </span>
            <button
              type="button"
              aria-label="Close settings"
              onClick={() =>
                dispatch({
                  type: EditorActionType.SELECT_BLOCK,
                  data: { blockId: null },
                })
              }
              className="ml-auto rounded-full p-1 text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              <X size={16} />
            </button>
          </header>

          <div className="flex flex-col gap-4 overflow-y-auto p-4">
            {/* Step name */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="block-name"
                className="text-xs font-medium text-zinc-600 dark:text-zinc-300"
              >
                Name
              </label>
              <input
                id="block-name"
                type="text"
                value={block.name ?? ""}
                placeholder={spec.label}
                onChange={(e) =>
                  dispatch({
                    type: EditorActionType.RENAME_BLOCK,
                    data: { blockId: block.id, name: e.target.value },
                  })
                }
                className="w-full rounded-md border border-black/10 dark:border-white/15 bg-transparent px-2 py-1 text-sm outline-none focus:border-black/30 dark:focus:border-white/30"
              />
            </div>

            {spec.fields.filter((f) => !isSlotField(f)).length === 0 ? (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                This component has no settings.
              </p>
            ) : (
              spec.fields
                .filter((f) => !isSlotField(f))
                .map((field) => (
                  <SettingsField
                    key={field.name}
                    field={field}
                    value={block.settings[field.name]}
                    onChange={(value) =>
                      dispatch({
                        type: EditorActionType.UPDATE_BLOCK_SETTING,
                        data: { blockId: block.id, field: field.name, value },
                      })
                    }
                  />
                ))
            )}
          </div>
        </>
      )}
    </aside>
  );
}
