import { getBlockSpec } from "@/app/schema";

/**
 * The in-memory editing model. These are editor-side types: every node carries a
 * stable client `id` (distinct from the runtime config, which is keyed by name
 * and order). The reducer mutates this document; serialize.ts maps it to/from the
 * runtime YAML/JSON config shape.
 */

export interface BlockNode {
  /** Stable client id; never serialized to the runtime config. */
  id: string;
  /** Block type, e.g. "log" or "set-payload". Matches a schema BlockSpec. */
  type: string;
  /** Optional human-readable step name. */
  name?: string;
  /** Block settings keyed by field name. Composite slots are added later. */
  settings: Record<string, unknown>;
}

export interface SourceNode {
  /** Name of a configured connector instance. */
  connector?: string;
  /** Connector-specific source type. */
  type?: string;
  settings: Record<string, unknown>;
}

export interface FlowDoc {
  id: string;
  name: string;
  source?: SourceNode;
  process: BlockNode[];
}

export interface ConnectorInstance {
  id: string;
  name: string;
  type: string;
  settings: Record<string, unknown>;
}

export interface EditorDocument {
  flows: FlowDoc[];
  connectors: ConnectorInstance[];
  /** Reusable processors referenced by name from a flow's process chain. */
  processors: BlockNode[];
}

/** Generate a stable client id. */
export function newId(): string {
  return crypto.randomUUID();
}

/** Seed a block's settings from the schema's scalar field defaults. */
export function defaultSettings(type: string): Record<string, unknown> {
  const spec = getBlockSpec(type);
  if (!spec) return {};
  const settings: Record<string, unknown> = {};
  for (const field of spec.fields) {
    if (field.default !== undefined) settings[field.name] = field.default;
  }
  return settings;
}

/** Create a fresh block of the given type with default settings. */
export function newBlock(type: string): BlockNode {
  return { id: newId(), type, settings: defaultSettings(type) };
}

/** An empty flow with no source and no steps. */
export function emptyFlow(name = "New flow"): FlowDoc {
  return { id: newId(), name, process: [] };
}

/** A blank document with a single empty flow — the "start from scratch" state. */
export function emptyDocument(): EditorDocument {
  return { flows: [emptyFlow()], connectors: [], processors: [] };
}
