import type { EditorDocument } from "@/app/model/document";

/**
 * Editor reducer actions. The payload travels on the action's `data` field (per
 * @eetr/react-reducer-utils' ReducerAction). The payload types below document
 * what `data` holds for each action.
 */
export enum EditorActionType {
  /** Add an empty flow to the document and make it active. */
  ADD_FLOW = "ADD_FLOW",
  /** Append (or insert at `index`) a new block into a flow (active by default). */
  ADD_BLOCK = "ADD_BLOCK",
  /** Reorder a block within a flow's process chain. */
  MOVE_BLOCK = "MOVE_BLOCK",
  /** Move a block from one flow to another (possibly nested) at an index. */
  MOVE_BLOCK_ACROSS = "MOVE_BLOCK_ACROSS",
  /** Remove a block from a flow by id. */
  REMOVE_BLOCK = "REMOVE_BLOCK",
  /** Remove a top-level flow from the document by id. */
  REMOVE_FLOW = "REMOVE_FLOW",
  /** Rename a flow (by id). */
  RENAME_FLOW = "RENAME_FLOW",
  /** Mark a canvas block as selected (or clear with null). */
  SELECT_BLOCK = "SELECT_BLOCK",
  /** Update one setting field of a block (by id). */
  UPDATE_BLOCK_SETTING = "UPDATE_BLOCK_SETTING",
  /** Rename a block's step name (by id). */
  RENAME_BLOCK = "RENAME_BLOCK",
  /** Switch which flow is active (the target for click-to-add). */
  SET_ACTIVE_FLOW = "SET_ACTIVE_FLOW",
  /** Give a flow a source of the chosen connector/type and select it. */
  ADD_SOURCE = "ADD_SOURCE",
  /** Mark a flow's source as selected (or clear with null). */
  SELECT_SOURCE = "SELECT_SOURCE",
  /** Update one setting field of a flow's source. */
  UPDATE_SOURCE_SETTING = "UPDATE_SOURCE_SETTING",
  /** Remove a flow's source. */
  REMOVE_SOURCE = "REMOVE_SOURCE",
  /** Replace the whole document (file load or "new"). */
  LOAD_DOCUMENT = "LOAD_DOCUMENT",
  /** Highlight a palette component. */
  SELECT_COMPONENT = "SELECT_COMPONENT",
  /** Clear the palette highlight. */
  CLEAR_SELECTION = "CLEAR_SELECTION",
}

export interface AddBlockPayload {
  blockType: string;
  /** Target flow; defaults to the active flow when omitted. */
  flowId?: string;
  index?: number;
}

export interface MoveBlockPayload {
  flowId: string;
  fromIndex: number;
  toIndex: number;
}

export interface MoveBlockAcrossPayload {
  fromFlowId: string;
  toFlowId: string;
  blockId: string;
  /** Insertion index in the target flow; appends when omitted. */
  index?: number;
}

export interface RemoveBlockPayload {
  flowId: string;
  blockId: string;
}

export interface RemoveFlowPayload {
  flowId: string;
}

export interface RenameFlowPayload {
  flowId: string;
  name: string;
}

export interface SelectBlockPayload {
  blockId: string | null;
}

export interface UpdateBlockSettingPayload {
  blockId: string;
  field: string;
  value: unknown;
}

export interface RenameBlockPayload {
  blockId: string;
  name: string;
}

export interface SetActiveFlowPayload {
  flowId: string;
}

export interface AddSourcePayload {
  flowId: string;
  /** Connector type that exposes the source (stored on the source node). */
  connector: string;
  /** Source type within that connector. */
  type: string;
}

export interface SelectSourcePayload {
  flowId: string | null;
}

export interface UpdateSourceSettingPayload {
  flowId: string;
  field: string;
  value: unknown;
}

export interface RemoveSourcePayload {
  flowId: string;
}

export interface LoadDocumentPayload {
  document: EditorDocument;
}
