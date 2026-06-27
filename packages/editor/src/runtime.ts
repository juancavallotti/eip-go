/**
 * Server-safe surface of the editor's document model — the pure helpers a host
 * needs to parse, validate, and inspect stored definitions outside the browser
 * (e.g. an MCP server), without dragging in the React editor components. Exposed
 * as the `@octo/editor/runtime` subpath so a Node route can import it cheaply.
 */

export {
  fromDefinitionYaml,
  toRunnableYaml,
  toDefinitionYaml,
} from "./app/model/runConfig";
export { validateDocument, type ValidationResult } from "./app/model/validate";
export { CAPABILITIES } from "./app/schema";
