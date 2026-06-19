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
import { DragData, DROPZONE_ID } from "./dnd";

/**
 * A single DndContext spanning the whole editor body so the palette (drag
 * sources) and the canvas (sortable blocks) share one drag session. The
 * onDragEnd handler is the one place that turns a drop into a reducer action:
 * a palette drag adds a block; a canvas drag reorders one.
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
    const flow = state.document.flows.find((f) => f.id === state.activeFlowId);
    if (!flow || !data) return;

    if (data.source === "palette") {
      const overIndex = flow.process.findIndex((b) => b.id === over.id);
      const index = over.id === DROPZONE_ID || overIndex === -1 ? undefined : overIndex;
      dispatch({
        type: EditorActionType.ADD_BLOCK,
        data: { blockType: data.blockType, index },
      });
      return;
    }

    // Reorder within the canvas.
    const from = flow.process.findIndex((b) => b.id === active.id);
    const to = flow.process.findIndex((b) => b.id === over.id);
    if (from === -1 || to === -1 || from === to) return;
    dispatch({
      type: EditorActionType.MOVE_BLOCK,
      data: { fromIndex: from, toIndex: to },
    });
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      {children}
    </DndContext>
  );
}
