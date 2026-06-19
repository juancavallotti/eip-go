import { describe, it, expect } from "vitest";
import { emptyDocument, newBlock } from "@/app/model/document";
import { EditorActionType } from "./actions";
import { EditorState, initialState, reducer } from "./reducer";

function activeFlow(state: EditorState) {
  return state.document.flows.find((f) => f.id === state.activeFlowId)!;
}

describe("editor reducer", () => {
  it("starts from a blank document with one active flow", () => {
    expect(initialState.document.flows).toHaveLength(1);
    expect(initialState.activeFlowId).toBe(initialState.document.flows[0].id);
    expect(activeFlow(initialState).process).toHaveLength(0);
  });

  it("appends a block and selects it", () => {
    const next = reducer(initialState, {
      type: EditorActionType.ADD_BLOCK,
      data: { blockType: "log" },
    });
    const process = activeFlow(next).process;
    expect(process).toHaveLength(1);
    expect(process[0].type).toBe("log");
    expect(next.selectedBlockId).toBe(process[0].id);
  });

  it("inserts a block at a given index", () => {
    let state = reducer(initialState, {
      type: EditorActionType.ADD_BLOCK,
      data: { blockType: "log" },
    });
    state = reducer(state, {
      type: EditorActionType.ADD_BLOCK,
      data: { blockType: "sql", index: 0 },
    });
    expect(activeFlow(state).process.map((b) => b.type)).toEqual(["sql", "log"]);
  });

  it("seeds block settings from schema defaults", () => {
    const next = reducer(initialState, {
      type: EditorActionType.ADD_BLOCK,
      data: { blockType: "log" },
    });
    expect(activeFlow(next).process[0].settings.level).toBe("info");
  });

  it("reorders blocks", () => {
    let state = initialState;
    for (const t of ["log", "sql", "rest"]) {
      state = reducer(state, {
        type: EditorActionType.ADD_BLOCK,
        data: { blockType: t },
      });
    }
    state = reducer(state, {
      type: EditorActionType.MOVE_BLOCK,
      data: { fromIndex: 0, toIndex: 2 },
    });
    expect(activeFlow(state).process.map((b) => b.type)).toEqual([
      "sql",
      "rest",
      "log",
    ]);
  });

  it("removes a block and clears its selection", () => {
    const added = reducer(initialState, {
      type: EditorActionType.ADD_BLOCK,
      data: { blockType: "log" },
    });
    const blockId = activeFlow(added).process[0].id;
    const next = reducer(added, {
      type: EditorActionType.REMOVE_BLOCK,
      data: { blockId },
    });
    expect(activeFlow(next).process).toHaveLength(0);
    expect(next.selectedBlockId).toBeNull();
  });

  it("loads a document and activates its first flow", () => {
    const doc = emptyDocument();
    doc.flows[0].name = "imported";
    doc.flows[0].process = [newBlock("log")];
    const next = reducer(initialState, {
      type: EditorActionType.LOAD_DOCUMENT,
      data: { document: doc },
    });
    expect(next.activeFlowId).toBe(doc.flows[0].id);
    expect(activeFlow(next).name).toBe("imported");
    expect(activeFlow(next).process).toHaveLength(1);
  });

  it("does not mutate the previous state", () => {
    const next = reducer(initialState, {
      type: EditorActionType.ADD_BLOCK,
      data: { blockType: "log" },
    });
    expect(activeFlow(initialState).process).toHaveLength(0);
    expect(next).not.toBe(initialState);
  });
});
