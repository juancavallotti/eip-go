import YAML from "yaml";
import type { EditorDocument } from "./document";
import { toConfig } from "./serialize";

/**
 * Renders the editor document as the YAML the runtime loads, ready to write to
 * disk for `octo run -watch`. It reuses {@link toConfig} for the connectors/flows
 * mapping and prepends a `service` block so the runner has a name for its startup
 * banner and logs. Disk I/O lives server-side (the run API); this stays pure so it
 * can run in the browser and in tests.
 */

/** Service name stamped on configs the editor runs (purely cosmetic for logs). */
export const RUN_SERVICE_NAME = "octo-editor";

export function toRunnableYaml(doc: EditorDocument): string {
  const config = { service: { name: RUN_SERVICE_NAME }, ...toConfig(doc) };
  return YAML.stringify(config);
}
