"use client";

import { ReducerAction, bootstrapProvider } from "@eetr/react-reducer-utils";

/**
 * Editor-wide state. EditorShell is a "large" component, so its state lives in a
 * reducer (per the coding standards) rather than scattered useState hooks.
 * Small, local UI state (e.g. an input value) should stay in useState.
 */
export enum EditorActionType {
  SELECT_COMPONENT = "SELECT_COMPONENT",
  CLEAR_SELECTION = "CLEAR_SELECTION",
}

export interface EditorState {
  /** id of the palette component currently selected, or null. */
  selectedComponentId: string | null;
}

const initialState: EditorState = {
  selectedComponentId: null,
};

function reducer(
  state: EditorState = initialState,
  action: ReducerAction<EditorActionType>,
): EditorState {
  switch (action.type) {
    case EditorActionType.SELECT_COMPONENT:
      return { ...state, selectedComponentId: action.data as string };
    case EditorActionType.CLEAR_SELECTION:
      return { ...state, selectedComponentId: null };
    default:
      return state;
  }
}

const { Provider, useContextAccessors } = bootstrapProvider<
  EditorState,
  ReducerAction<EditorActionType>
>(reducer, initialState);

export { Provider as EditorStateProvider, useContextAccessors as useEditorState };
