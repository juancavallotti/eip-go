/**
 * Shared drag-and-drop constants and payload types. Both the palette (drag
 * sources) and the canvas (sortable blocks + drop zone) reference these so the
 * central DndProvider can tell a palette-add apart from a reorder.
 */

/** Droppable id for the canvas footer area — a drop here appends a block. */
export const DROPZONE_ID = "flow-dropzone";

/** Dragging a block type out of the palette to add it. */
export interface PaletteDragData {
  source: "palette";
  blockType: string;
}

/** Dragging an existing block within the canvas to reorder it. */
export interface CanvasDragData {
  source: "canvas";
}

export type DragData = PaletteDragData | CanvasDragData;
