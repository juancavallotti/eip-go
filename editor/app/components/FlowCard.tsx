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
import StepArrow from "./StepArrow";

/**
 * One flow drawn as the schematic in the brief: a dashed container labelled with
 * the flow name, a source node up top, a dashed divider, then the process nodes
 * connected by downward arrows, and a drop zone that accepts palette drags.
 * Clicking the card makes it the active flow (the click-to-add target).
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
        "rounded-3xl border-2 border-dashed bg-black/[0.015] dark:bg-white/[0.02] p-5",
        active
          ? "border-sky-400/70"
          : "border-zinc-300 dark:border-zinc-700",
      ].join(" ")}
    >
      <h3 className="mb-3 font-mono text-xs text-zinc-500">{flow.name}</h3>
      <div className="flex flex-col items-center">
        <SourceCard source={flow.source} />
        <div className="my-3 w-full border-t border-dashed border-zinc-300 dark:border-zinc-700" />
        <SortableContext
          items={flow.process.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul
            aria-label="Flow steps"
            className="m-0 flex w-full list-none flex-col items-center p-0"
          >
            {flow.process.map((block) => (
              <li key={block.id} className="flex flex-col items-center">
                <StepArrow />
                <BlockCard block={block} flowId={flow.id} />
              </li>
            ))}
          </ul>
        </SortableContext>
        {!empty && <StepArrow />}
        <div
          ref={setNodeRef}
          className={[
            "mt-1 w-full rounded-2xl border-2 border-dashed px-3 py-4 text-center text-sm text-zinc-500 transition-colors",
            isOver
              ? "border-sky-400 bg-sky-400/5"
              : "border-zinc-300 dark:border-zinc-700",
          ].join(" ")}
        >
          {empty
            ? "Click or drag a component to build this flow"
            : "Drop a component here to add it"}
        </div>
      </div>
    </section>
  );
}
