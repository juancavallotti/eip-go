"use client";

import { createElement } from "react";
import { GripVertical, X } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BlockNode } from "@/app/model/document";
import { getBlockSpec, resolveIcon } from "@/app/schema";
import { useEditorState, EditorActionType } from "@/app/state/editorState";

/**
 * One step in the flow: a sortable card with a drag handle (reorder), the block's
 * icon + label + optional name, and a remove button. Selecting it marks it active
 * for the (future) settings editor.
 */
export default function BlockCard({
  block,
  flowId,
}: {
  block: BlockNode;
  flowId: string;
}) {
  const { state, dispatch } = useEditorState();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id, data: { source: "canvas", flowId } });

  const spec = getBlockSpec(block.type);
  const icon = createElement(resolveIcon(spec?.icon ?? ""), {
    size: 18,
    className: "text-zinc-500 shrink-0",
  });
  const selected = state.selectedBlockId === block.id;
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "flex items-center gap-2 rounded-lg border bg-white dark:bg-zinc-900 px-2 py-2 shadow-sm",
        selected
          ? "border-black/40 dark:border-white/40"
          : "border-black/10 dark:border-white/10",
        isDragging ? "opacity-60" : "",
      ].join(" ")}
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        className="cursor-grab text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>
      <button
        type="button"
        onClick={() =>
          dispatch({
            type: EditorActionType.SELECT_BLOCK,
            data: { blockId: block.id },
          })
        }
        className="flex flex-1 items-center gap-2 min-w-0 text-left"
      >
        {icon}
        <span className="text-sm font-medium">{spec?.label ?? block.type}</span>
        {block.name && (
          <span className="text-xs text-zinc-500 truncate">{block.name}</span>
        )}
      </button>
      <button
        type="button"
        aria-label="Remove step"
        onClick={() =>
          dispatch({
            type: EditorActionType.REMOVE_BLOCK,
            data: { flowId, blockId: block.id },
          })
        }
        className="text-zinc-400 hover:text-red-500 shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  );
}
