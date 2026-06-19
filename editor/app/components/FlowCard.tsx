"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { FlowDoc } from "@/app/model/document";
import { useEditorState, EditorActionType } from "@/app/state/editorState";
import { dropzoneId } from "./dnd";
import SourceCard from "./SourceCard";
import BlockCard from "./BlockCard";

/**
 * One flow rendered as a vertical, reorder-only pipeline: a header, a source
 * card, the ordered process blocks (drag to reorder), and a drop zone that
 * accepts palette drags to append. Clicking the card makes it the active flow —
 * the target for click-to-add from the palette.
 */
export default function FlowCard({
  flow,
  active,
}: {
  flow: FlowDoc;
  active: boolean;
}) {
  const { dispatch } = useEditorState();
  const { setNodeRef, isOver } = useDroppable({
    id: dropzoneId(flow.id),
    data: { flowId: flow.id },
  });
  const empty = flow.process.length === 0;

  return (
    <section
      aria-label={flow.name}
      onClick={() =>
        dispatch({
          type: EditorActionType.SET_ACTIVE_FLOW,
          data: { flowId: flow.id },
        })
      }
      className={[
        "flex flex-col gap-2 rounded-xl border bg-black/[0.02] dark:bg-white/[0.03] p-3",
        active
          ? "border-black/30 dark:border-white/30"
          : "border-black/10 dark:border-white/10",
      ].join(" ")}
    >
      <h3 className="px-1 text-sm font-semibold">{flow.name}</h3>
      <SourceCard source={flow.source} />
      <SortableContext
        items={flow.process.map((b) => b.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul aria-label="Flow steps" className="flex flex-col gap-2">
          {flow.process.map((block) => (
            <li key={block.id}>
              <BlockCard block={block} flowId={flow.id} />
            </li>
          ))}
        </ul>
      </SortableContext>
      <div
        ref={setNodeRef}
        className={[
          "rounded-lg border border-dashed px-3 py-5 text-center text-sm text-zinc-500 transition-colors",
          isOver
            ? "border-black/40 dark:border-white/40 bg-black/5 dark:bg-white/10"
            : "border-black/15 dark:border-white/20",
        ].join(" ")}
      >
        {empty
          ? "Click or drag a component to build this flow"
          : "Drop a component here to add it"}
      </div>
    </section>
  );
}
