import { describe, expect, it } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { registerIntegrationTools } from "./integration";
import type { IntegrationRecord, OctoMcpConfig } from "../backend";

/** A trivial in-memory IntegrationStore for exercising the tools end to end. */
function fakeStore(seed: IntegrationRecord[] = []) {
  const rows = new Map(seed.map((r) => [r.id, { ...r }]));
  let seq = rows.size;
  return {
    rows,
    list: async () =>
      [...rows.values()].map(({ id, name }) => ({ id, name })),
    get: async (id: string) => {
      const r = rows.get(id);
      if (!r) throw new Error(`no such integration: ${id}`);
      return { ...r };
    },
    create: async (name: string, definition: string) => {
      const id = `id-${++seq}`;
      const r = { id, name, definition };
      rows.set(id, r);
      return { ...r };
    },
    update: async (id: string, name: string | undefined, definition: string) => {
      const r = rows.get(id);
      if (!r) throw new Error(`no such integration: ${id}`);
      const next = { id, name: name ?? r.name, definition };
      rows.set(id, next);
      return { ...next };
    },
  };
}

/** Stand up a linked client/server with the integration tools registered. */
async function connect(config: OctoMcpConfig): Promise<Client> {
  const server = new McpServer({ name: "octo-test", version: "0.0.0" });
  registerIntegrationTools(server, config);
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "0.0.0" });
  await Promise.all([server.connect(serverT), client.connect(clientT)]);
  return client;
}

function baseConfig(store: OctoMcpConfig["store"]): OctoMcpConfig {
  return { store, validate: () => ({ valid: true, errors: [] }), runtimeSchema: {} };
}

/** Parse the JSON a tool returned in its first text content block. */
function parse(res: CallToolResult): unknown {
  const block = (res.content as { type: string; text: string }[])[0];
  return JSON.parse(block.text);
}

describe("integration tools", () => {
  it("lists integrations as { id, name }", async () => {
    const store = fakeStore([
      { id: "a", name: "Alpha", definition: "x" },
      { id: "b", name: "Beta", definition: "y" },
    ]);
    const client = await connect(baseConfig(store));
    const res = (await client.callTool({
      name: "list_integrations",
      arguments: {},
    })) as CallToolResult;
    expect(parse(res)).toEqual([
      { id: "a", name: "Alpha" },
      { id: "b", name: "Beta" },
    ]);
  });

  it("opens an integration by id", async () => {
    const store = fakeStore([{ id: "a", name: "Alpha", definition: "the-yaml" }]);
    const client = await connect(baseConfig(store));
    const res = (await client.callTool({
      name: "open_integration",
      arguments: { id: "a" },
    })) as CallToolResult;
    expect(parse(res)).toEqual({ id: "a", name: "Alpha", definition: "the-yaml" });
  });

  it("returns an error result when opening a missing integration", async () => {
    const store = fakeStore();
    const client = await connect(baseConfig(store));
    const res = (await client.callTool({
      name: "open_integration",
      arguments: { id: "nope" },
    })) as CallToolResult;
    expect(res.isError).toBe(true);
    expect((res.content as { text: string }[])[0].text).toContain("nope");
  });

  it("creates an integration", async () => {
    const store = fakeStore();
    const client = await connect(baseConfig(store));
    const res = (await client.callTool({
      name: "create_integration",
      arguments: { name: "New", definition: "service:\n  name: New" },
    })) as CallToolResult;
    const created = parse(res) as IntegrationRecord;
    expect(created.name).toBe("New");
    expect(store.rows.get(created.id)?.definition).toBe("service:\n  name: New");
  });

  it("validates a draft definition without saving, returning descriptive errors", async () => {
    const store = fakeStore();
    const cfg: OctoMcpConfig = {
      store,
      runtimeSchema: {},
      validate: (def) =>
        def.includes("flows")
          ? { valid: true, errors: [] }
          : { valid: false, errors: ['Flow "x": source is incomplete.'] },
    };
    const client = await connect(cfg);

    const bad = (await client.callTool({
      name: "validate_definition",
      arguments: { definition: "service:\n  name: x" },
    })) as CallToolResult;
    expect(parse(bad)).toEqual({
      valid: false,
      errors: ['Flow "x": source is incomplete.'],
    });

    const good = (await client.callTool({
      name: "validate_definition",
      arguments: { definition: "service:\n  name: x\nflows: []" },
    })) as CallToolResult;
    expect(parse(good)).toEqual({ valid: true, errors: [] });

    // Pure check: nothing was written to the store.
    expect(store.rows.size).toBe(0);
  });

  it("lists flows with their source type, null for sourceless flows", async () => {
    const definition = [
      "service:",
      "  name: Demo",
      "flows:",
      "  - name: greet",
      "    source:",
      "      connector: ticker",
      "      type: cron",
      "    process: []",
      "  - name: helper",
      "    process: []",
    ].join("\n");
    const store = fakeStore([{ id: "a", name: "Demo", definition }]);
    const client = await connect(baseConfig(store));
    const res = (await client.callTool({
      name: "list_flows",
      arguments: { id: "a" },
    })) as CallToolResult;
    expect(parse(res)).toEqual([
      { name: "greet", source: "cron" },
      { name: "helper", source: null },
    ]);
  });

  it("returns [] when the definition declares no flows", async () => {
    const store = fakeStore([
      { id: "a", name: "Empty", definition: "service:\n  name: Empty\n" },
    ]);
    const client = await connect(baseConfig(store));
    const res = (await client.callTool({
      name: "list_flows",
      arguments: { id: "a" },
    })) as CallToolResult;
    expect(parse(res)).toEqual([]);
  });

  it("updates an integration's definition and name", async () => {
    const store = fakeStore([{ id: "a", name: "Old", definition: "v1" }]);
    const client = await connect(baseConfig(store));
    const res = (await client.callTool({
      name: "update_integration",
      arguments: { id: "a", name: "Renamed", definition: "v2" },
    })) as CallToolResult;
    expect(parse(res)).toEqual({ id: "a", name: "Renamed", definition: "v2" });
    expect(store.rows.get("a")).toMatchObject({ name: "Renamed", definition: "v2" });
  });
});
