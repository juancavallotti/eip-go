/**
 * Shared drag-and-drop constants and payload types. Both the palette (drag
 * sources) and the canvas (sortable blocks + per-flow drop zones) reference these
 * so the central DndProvider can tell a palette-add from a reorder and route it
 * to the right flow.
 */

/** Droppable id for a flow's footer area — a drop here appends to that flow. */
export function dropzoneId(flowId: string): string {
  return `dropzone-${flowId}`;
}

/** Dragging a block type out of the palette to add it. */
export interface PaletteDragData {
  source: "palette";
  blockType: string;
}

/** Dragging an existing block within a flow to reorder it. */
export interface CanvasDragData {
  source: "canvas";
  flowId: string;
}

export type DragData = PaletteDragData | CanvasDragData;

/** Data attached to every droppable target (blocks and flow drop zones). */
export interface DropData {
  flowId: string;
}
