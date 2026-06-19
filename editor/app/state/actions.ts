import type { EditorDocument } from "@/app/model/document";

/**
 * Editor reducer actions. The payload travels on the action's `data` field (per
 * @eetr/react-reducer-utils' ReducerAction). The payload types below document
 * what `data` holds for each action.
 */
export enum EditorActionType {
  /** Append (or insert at `index`) a new block into the active flow. */
  ADD_BLOCK = "ADD_BLOCK",
  /** Reorder a block within the active flow's process chain. */
  MOVE_BLOCK = "MOVE_BLOCK",
  /** Remove a block from the active flow by id. */
  REMOVE_BLOCK = "REMOVE_BLOCK",
  /** Mark a canvas block as selected (or clear with null). */
  SELECT_BLOCK = "SELECT_BLOCK",
  /** Switch which flow the canvas shows. */
  SET_ACTIVE_FLOW = "SET_ACTIVE_FLOW",
  /** Replace the whole document (file load or "new"). */
  LOAD_DOCUMENT = "LOAD_DOCUMENT",
  /** Highlight a palette component. */
  SELECT_COMPONENT = "SELECT_COMPONENT",
  /** Clear the palette highlight. */
  CLEAR_SELECTION = "CLEAR_SELECTION",
}

export interface AddBlockPayload {
  blockType: string;
  index?: number;
}

export interface MoveBlockPayload {
  fromIndex: number;
  toIndex: number;
}

export interface RemoveBlockPayload {
  blockId: string;
}

export interface SelectBlockPayload {
  blockId: string | null;
}

export interface SetActiveFlowPayload {
  flowId: string;
}

export interface LoadDocumentPayload {
  document: EditorDocument;
}
