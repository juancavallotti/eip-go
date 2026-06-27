import type { IntegrationStore } from "@octo/mcp";
import * as store from "../api/fs/store";

/**
 * The standalone host's {@link IntegrationStore}: a thin shim over the local disk
 * store the editor's filesystem capability already uses. "Integrations" here are
 * the `*.yaml` flow files under the store root; the MCP layer treats their id,
 * name, and definition uniformly. `update` renames on disk when a new name's slug
 * differs (matching the editor's save), otherwise overwrites in place.
 */
export const fsIntegrationStore: IntegrationStore = {
  list: () => store.listFlows(),
  get: (id) => store.readFlow(id),
  create: (name, definition) => store.createFlow(name, definition),
  update: (id, name, definition) =>
    name === undefined
      ? store.writeFlow(id, definition)
      : store.updateFlow(id, name, definition),
};
