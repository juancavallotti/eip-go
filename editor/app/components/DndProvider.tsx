"use client";

import { ReactNode } from "react";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useEditorState, EditorActionType } from "@/app/state/editorState";
import { DragData, DropData } from "./dnd";

/**
 * A single DndContext spanning the whole editor body so the palette (drag
 * sources) and every flow's blocks (sortable) share one drag session. onDragEnd
 * is the one place a drop becomes a reducer action: a palette drag adds a block
 * to the flow it was dropped on; a canvas drag reorders within its own flow.
 */
export default function DndProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useEditorState();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const data = active.data.current as DragData | undefined;
    const target = over.data.current as DropData | undefined;
    const flowId = target?.flowId;
    if (!data || !flowId) return;
    const flow = state.document.flows.find((f) => f.id === flowId);
    if (!flow) return;

    if (data.source === "palette") {
      const overIndex = flow.process.findIndex((b) => b.id === over.id);
      dispatch({
        type: EditorActionType.ADD_BLOCK,
        data: {
          blockType: data.blockType,
          flowId,
          index: overIndex === -1 ? undefined : overIndex,
        },
      });
      return;
    }

    // Reorder within the same flow only (cross-flow moves come later).
    if (data.flowId !== flowId) return;
    const from = flow.process.findIndex((b) => b.id === active.id);
    const to = flow.process.findIndex((b) => b.id === over.id);
    if (from === -1 || to === -1 || from === to) return;
    dispatch({
      type: EditorActionType.MOVE_BLOCK,
      data: { flowId, fromIndex: from, toIndex: to },
    });
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      {children}
    </DndContext>
  );
}
