import {
  BlockNode,
  EditorDocument,
  FlowDoc,
  SourceNode,
  emptyDocument,
  newId,
} from "./document";

/**
 * Maps the editor document to/from the runtime config shape (the YAML/JSON the
 * runtime loads — see runtime/types/flow.go). This keeps the model honest: it can
 * round-trip a file or start from scratch. Actual disk I/O is wired separately.
 *
 * Scope note: the scaffold round-trips leaf-block fields (type/name/settings) and
 * a flow's source. Composite slots (then/else/branches/cases/body) are part of
 * the model but not yet folded through here — they land with the nested editor.
 */

export interface RuntimeBlock {
  type?: string;
  name?: string;
  settings?: Record<string, unknown>;
}

export interface RuntimeSource {
  connector?: string;
  type?: string;
  settings?: Record<string, unknown>;
}

export interface RuntimeFlow {
  name?: string;
  source?: RuntimeSource;
  process?: RuntimeBlock[];
}

export interface RuntimeConfig {
  flows?: RuntimeFlow[];
}

function hasKeys(o: Record<string, unknown>): boolean {
  return Object.keys(o).length > 0;
}

function blockToRuntime(block: BlockNode): RuntimeBlock {
  const out: RuntimeBlock = { type: block.type };
  if (block.name) out.name = block.name;
  if (hasKeys(block.settings)) out.settings = block.settings;
  return out;
}

function sourceToRuntime(source: SourceNode): RuntimeSource {
  const out: RuntimeSource = {};
  if (source.connector) out.connector = source.connector;
  if (source.type) out.type = source.type;
  if (hasKeys(source.settings)) out.settings = source.settings;
  return out;
}

export function toConfig(doc: EditorDocument): RuntimeConfig {
  return {
    flows: doc.flows.map((flow) => {
      const out: RuntimeFlow = { name: flow.name };
      if (flow.source) out.source = sourceToRuntime(flow.source);
      out.process = flow.process.map(blockToRuntime);
      return out;
    }),
  };
}

function blockFromRuntime(block: RuntimeBlock): BlockNode {
  return {
    id: newId(),
    type: block.type ?? "",
    name: block.name,
    settings: block.settings ?? {},
  };
}

function flowFromRuntime(flow: RuntimeFlow): FlowDoc {
  const out: FlowDoc = {
    id: newId(),
    name: flow.name ?? "flow",
    process: (flow.process ?? []).map(blockFromRuntime),
  };
  if (flow.source) {
    out.source = {
      connector: flow.source.connector,
      type: flow.source.type,
      settings: flow.source.settings ?? {},
    };
  }
  return out;
}

export function fromConfig(config: RuntimeConfig): EditorDocument {
  const flows = (config.flows ?? []).map(flowFromRuntime);
  if (flows.length === 0) return emptyDocument();
  return { flows, connectors: [], processors: [] };
}
