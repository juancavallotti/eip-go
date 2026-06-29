/**
 * State for the object store browser. The selection/editing fields move together —
 * picking a deployment clears the key, value, and draft; saving updates the value
 * and version at once — so they live in one reducer rather than a dozen useStates
 * with hand-synchronized resets. The component owns the async (fetching, URL sync);
 * the reducer is the pure transition table.
 */

import type { ObjectEntry, ObjectValue } from "@/app/model/objects";

/** The default namespace, shown until another is picked (always available). */
export const DEFAULT_NAMESPACE = "user";

/** Suffix marking the encrypted secret namespaces (mirrors the orchestrator's kv
 *  package). Their values can't be viewed or edited here — only listed and deleted
 *  for cleanup — so the UI uses this to switch the detail panel into a delete-only
 *  mode. */
export const SECRET_NAMESPACE_SUFFIX = "_secrets";

/** Whether a namespace holds encrypted secret values (view/edit disabled in the UI). */
export const isSecretNamespace = (namespace: string): boolean =>
  namespace.endsWith(SECRET_NAMESPACE_SUFFIX);

export interface State {
  deploymentId: string | null;
  /** The non-secret namespaces the deployment holds; null while not loaded. */
  namespaces: string[] | null;
  /** The namespace currently browsed (defaults to DEFAULT_NAMESPACE). */
  namespace: string;
  /** The selected deployment+namespace's keys; null while not loaded / loading. */
  entries: ObjectEntry[] | null;
  selectedKey: string | null;
  /** The loaded value+version for selectedKey, or null when none is loaded. */
  current: ObjectValue | null;
  /** The editable value text (the textarea's content). */
  draft: string;
  /** Whether the "new key" form is open. */
  creating: boolean;
  newKey: string;
  /** A write/delete is in flight. */
  busy: boolean;
  error: string | null;
}

export type Action =
  | { type: "selectDeployment"; deploymentId: string | null }
  | { type: "namespacesLoaded"; namespaces: string[] }
  | { type: "selectNamespace"; namespace: string }
  | { type: "entriesLoaded"; entries: ObjectEntry[] }
  | { type: "selectKey"; key: string }
  | { type: "valueLoaded"; value: ObjectValue }
  | { type: "startCreate" }
  | { type: "cancelCreate" }
  | { type: "setNewKey"; value: string }
  | { type: "setDraft"; value: string }
  | { type: "busy" }
  | { type: "saved"; current: ObjectValue }
  | { type: "created"; key: string }
  | { type: "deleted" }
  | { type: "error"; error: string };

/** Build the initial state, seeding the selection from the URL params. */
export function initState(
  deploymentId: string | null,
  selectedKey: string | null,
  namespace: string | null,
): State {
  return {
    deploymentId,
    namespaces: null,
    namespace: namespace || DEFAULT_NAMESPACE,
    entries: null,
    selectedKey,
    current: null,
    draft: "",
    creating: false,
    newKey: "",
    busy: false,
    error: null,
  };
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "selectDeployment":
      return {
        ...state,
        deploymentId: action.deploymentId,
        namespaces: null,
        namespace: DEFAULT_NAMESPACE,
        entries: null,
        selectedKey: null,
        current: null,
        draft: "",
        creating: false,
      };
    case "namespacesLoaded":
      return { ...state, namespaces: action.namespaces };
    case "selectNamespace":
      return {
        ...state,
        namespace: action.namespace,
        entries: null,
        selectedKey: null,
        current: null,
        draft: "",
        creating: false,
      };
    case "entriesLoaded":
      return { ...state, entries: action.entries, error: null };
    case "selectKey":
      return {
        ...state,
        creating: false,
        current: null,
        draft: "",
        selectedKey: action.key,
      };
    case "valueLoaded":
      return {
        ...state,
        current: action.value,
        draft: action.value.value,
        error: null,
      };
    case "startCreate":
      return {
        ...state,
        creating: true,
        selectedKey: null,
        current: null,
        newKey: "",
        draft: "",
      };
    case "cancelCreate":
      return { ...state, creating: false };
    case "setNewKey":
      return { ...state, newKey: action.value };
    case "setDraft":
      return { ...state, draft: action.value };
    case "busy":
      return { ...state, busy: true };
    case "saved":
      return {
        ...state,
        current: action.current,
        draft: action.current.value,
        busy: false,
        error: null,
      };
    case "created":
      return {
        ...state,
        creating: false,
        selectedKey: action.key,
        current: null,
        draft: "",
        busy: false,
        error: null,
      };
    case "deleted":
      return {
        ...state,
        selectedKey: null,
        current: null,
        draft: "",
        busy: false,
        error: null,
      };
    case "error":
      return { ...state, error: action.error, busy: false };
    default:
      return state;
  }
}
