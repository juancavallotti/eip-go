import { ReducerAction } from "@eetr/react-reducer-utils";
import {
  EditorDocument,
  FlowDoc,
  emptyDocument,
  newBlock,
} from "@/app/model/document";
import {
  AddBlockPayload,
  EditorActionType,
  LoadDocumentPayload,
  MoveBlockPayload,
  RemoveBlockPayload,
  SelectBlockPayload,
  SetActiveFlowPayload,
} from "./actions";

/**
 * Editor-wide state. EditorShell is a "large" component, so its state lives in a
 * reducer (per the coding standards). The document is the in-memory editing model
 * (see app/model/document.ts); selection and active-flow are view state.
 */
export interface EditorState {
  document: EditorDocument;
  /** Which flow the canvas is editing. */
  activeFlowId: string | null;
  /** Currently selected block on the canvas, or null. */
  selectedBlockId: string | null;
  /** Currently highlighted palette component id, or null. */
  selectedComponentId: string | null;
}

function makeInitialState(): EditorState {
  const document = emptyDocument();
  return {
    document,
    activeFlowId: document.flows[0]?.id ?? null,
    selectedBlockId: null,
    selectedComponentId: null,
  };
}

export const initialState: EditorState = makeInitialState();

/** Immutable move of one array element from one index to another. */
function arrayMove<T>(items: T[], from: number, to: number): T[] {
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** Apply `fn` to the active flow, returning a new document. */
function updateActiveFlow(
  state: EditorState,
  fn: (flow: FlowDoc) => FlowDoc,
): EditorDocument {
  return {
    ...state.document,
    flows: state.document.flows.map((flow) =>
      flow.id === state.activeFlowId ? fn(flow) : flow,
    ),
  };
}

function addBlock(state: EditorState, p: AddBlockPayload): EditorState {
  const block = newBlock(p.blockType);
  const document = updateActiveFlow(state, (flow) => {
    const process = flow.process.slice();
    const at = p.index ?? process.length;
    process.splice(at, 0, block);
    return { ...flow, process };
  });
  return { ...state, document, selectedBlockId: block.id };
}

function moveBlock(state: EditorState, p: MoveBlockPayload): EditorState {
  const document = updateActiveFlow(state, (flow) => ({
    ...flow,
    process: arrayMove(flow.process, p.fromIndex, p.toIndex),
  }));
  return { ...state, document };
}

function removeBlock(state: EditorState, p: RemoveBlockPayload): EditorState {
  const document = updateActiveFlow(state, (flow) => ({
    ...flow,
    process: flow.process.filter((b) => b.id !== p.blockId),
  }));
  const selectedBlockId =
    state.selectedBlockId === p.blockId ? null : state.selectedBlockId;
  return { ...state, document, selectedBlockId };
}

function loadDocument(state: EditorState, p: LoadDocumentPayload): EditorState {
  return {
    ...state,
    document: p.document,
    activeFlowId: p.document.flows[0]?.id ?? null,
    selectedBlockId: null,
  };
}

export function reducer(
  state: EditorState = initialState,
  action: ReducerAction<EditorActionType>,
): EditorState {
  switch (action.type) {
    case EditorActionType.ADD_BLOCK:
      return addBlock(state, action.data as AddBlockPayload);
    case EditorActionType.MOVE_BLOCK:
      return moveBlock(state, action.data as MoveBlockPayload);
    case EditorActionType.REMOVE_BLOCK:
      return removeBlock(state, action.data as RemoveBlockPayload);
    case EditorActionType.SELECT_BLOCK:
      return {
        ...state,
        selectedBlockId: (action.data as SelectBlockPayload).blockId,
      };
    case EditorActionType.SET_ACTIVE_FLOW:
      return {
        ...state,
        activeFlowId: (action.data as SetActiveFlowPayload).flowId,
        selectedBlockId: null,
      };
    case EditorActionType.LOAD_DOCUMENT:
      return loadDocument(state, action.data as LoadDocumentPayload);
    case EditorActionType.SELECT_COMPONENT:
      return { ...state, selectedComponentId: action.data as string };
    case EditorActionType.CLEAR_SELECTION:
      return { ...state, selectedComponentId: null };
    default:
      return state;
  }
}
