import { describe, it, expect } from "vitest";
import { emptyDocument, newBlock } from "./document";
import { fromConfig, toConfig } from "./serialize";

describe("serialize", () => {
  it("maps a flow's leaf blocks to the runtime config shape", () => {
    const doc = emptyDocument();
    doc.flows[0].name = "demo";
    const log = newBlock("log");
    log.name = "say-hi";
    doc.flows[0].process = [log];

    const config = toConfig(doc);
    expect(config.flows).toHaveLength(1);
    expect(config.flows![0].name).toBe("demo");
    expect(config.flows![0].process![0].type).toBe("log");
    expect(config.flows![0].process![0].name).toBe("say-hi");
    expect(config.flows![0].process![0].settings).toMatchObject({ level: "info" });
  });

  it("omits empty settings and absent source", () => {
    const doc = emptyDocument();
    doc.flows[0].process = [{ id: "x", type: "noop", settings: {} }];
    const block = toConfig(doc).flows![0].process![0];
    expect(block.settings).toBeUndefined();
    expect(toConfig(doc).flows![0].source).toBeUndefined();
  });

  it("round-trips through fromConfig with fresh ids", () => {
    const doc = emptyDocument();
    doc.flows[0].name = "demo";
    doc.flows[0].process = [newBlock("set-payload")];

    const restored = fromConfig(toConfig(doc));
    expect(restored.flows).toHaveLength(1);
    expect(restored.flows[0].name).toBe("demo");
    expect(restored.flows[0].process[0].type).toBe("set-payload");
    expect(restored.flows[0].process[0].id).not.toBe(doc.flows[0].process[0].id);
  });

  it("falls back to an empty document for a config with no flows", () => {
    expect(fromConfig({}).flows).toHaveLength(1);
  });
});
