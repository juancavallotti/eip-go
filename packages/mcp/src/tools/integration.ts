import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OctoMcpConfig } from "../backend";
import { guard, jsonResult } from "../result";

/**
 * The integration-authoring tools: list the catalogue, open one to read its
 * definition, and create/update definitions. They delegate straight to the host's
 * injected {@link OctoMcpConfig.store}; the run-control tools live separately
 * (they also need the per-session namespace).
 */
export function registerIntegrationTools(
  server: McpServer,
  config: OctoMcpConfig,
): void {
  const { store } = config;

  server.registerTool(
    "list_integrations",
    {
      title: "List integrations",
      description:
        "List every saved integration as { id, name }. Use `open_integration` to read one's definition.",
      inputSchema: {},
    },
    () => guard(async () => jsonResult(await store.list())),
  );

  server.registerTool(
    "open_integration",
    {
      title: "Open integration",
      description:
        "Read one integration by id, returning { id, name, definition }. The definition is the runtime YAML the integration runs.",
      inputSchema: { id: z.string().min(1).describe("The integration id.") },
    },
    ({ id }) => guard(async () => jsonResult(await store.get(id))),
  );

  server.registerTool(
    "create_integration",
    {
      title: "Create integration",
      description:
        "Create a new integration from a name and a runtime-YAML definition. Read the `octo://runtime/schema` resource first to know the valid blocks and connectors. Returns the created { id, name, definition }.",
      inputSchema: {
        name: z.string().min(1).describe("Display name for the integration."),
        definition: z
          .string()
          .min(1)
          .describe("Runtime YAML (service, connectors, flows)."),
      },
    },
    ({ name, definition }) =>
      guard(async () => jsonResult(await store.create(name, definition))),
  );

  server.registerTool(
    "update_integration",
    {
      title: "Update integration",
      description:
        "Overwrite an existing integration's definition (and optionally rename it). Returns the updated { id, name, definition } — the id may change if a rename re-slugs it.",
      inputSchema: {
        id: z.string().min(1).describe("The integration id to update."),
        name: z
          .string()
          .min(1)
          .optional()
          .describe("New display name; omit to keep the current name."),
        definition: z
          .string()
          .min(1)
          .describe("The new runtime YAML definition."),
      },
    },
    ({ id, name, definition }) =>
      guard(async () => jsonResult(await store.update(id, name, definition))),
  );
}
