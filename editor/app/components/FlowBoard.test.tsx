import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditorStateProvider } from "@/app/state/editorState";
import DndProvider from "./DndProvider";
import Sidebar from "./Sidebar";
import Canvas from "./Canvas";

function renderEditor() {
  return render(
    <EditorStateProvider>
      <DndProvider>
        <Sidebar />
        <Canvas />
      </DndProvider>
    </EditorStateProvider>,
  );
}

function flows() {
  return screen.getAllByRole("region");
}

function stepsIn(region: HTMLElement) {
  return within(region).getByRole("list", { name: "Flow steps" });
}

describe("FlowBoard", () => {
  it("starts with a single empty flow", () => {
    renderEditor();
    expect(flows()).toHaveLength(1);
    expect(
      screen.getByText("Click or drag a component to build this flow"),
    ).toBeInTheDocument();
  });

  it("adds a block to the active flow when a palette item is clicked", async () => {
    renderEditor();
    await userEvent.click(screen.getByText("Log"));

    const items = within(stepsIn(flows()[0])).getAllByRole("listitem");
    expect(items).toHaveLength(1);
    expect(within(items[0]).getByText("Log")).toBeInTheDocument();
  });

  it("appends new flows with the Add flow button", async () => {
    renderEditor();
    await userEvent.click(screen.getByRole("button", { name: "Add flow" }));
    expect(flows()).toHaveLength(2);
  });

  it("routes click-to-add to the most recently added (active) flow", async () => {
    renderEditor();
    await userEvent.click(screen.getByRole("button", { name: "Add flow" }));
    await userEvent.click(screen.getByText("Log"));

    expect(within(stepsIn(flows()[0])).queryAllByRole("listitem")).toHaveLength(0);
    expect(within(stepsIn(flows()[1])).getAllByRole("listitem")).toHaveLength(1);
  });

  it("removes a block when its remove button is clicked", async () => {
    renderEditor();
    await userEvent.click(screen.getByText("Log"));
    expect(within(stepsIn(flows()[0])).getAllByRole("listitem")).toHaveLength(1);

    await userEvent.click(screen.getByRole("button", { name: "Remove step" }));
    expect(within(stepsIn(flows()[0])).queryAllByRole("listitem")).toHaveLength(0);
  });
});
