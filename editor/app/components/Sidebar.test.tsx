import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditorStateProvider } from "@/app/state/editorState";
import Sidebar from "./Sidebar";

function renderSidebar() {
  return render(
    <EditorStateProvider>
      <Sidebar />
    </EditorStateProvider>,
  );
}

describe("Sidebar", () => {
  it("filters components by query (local useState)", async () => {
    renderSidebar();
    expect(screen.getByText("Database")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Filter components"), "http");

    expect(screen.queryByText("Database")).not.toBeInTheDocument();
    expect(screen.getByText("HTTP")).toBeInTheDocument();
  });

  it("marks a component selected on click (reducer dispatch)", async () => {
    renderSidebar();
    const sourceButton = screen.getByRole("button", { name: /source/i });
    expect(sourceButton).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(sourceButton);

    expect(sourceButton).toHaveAttribute("aria-pressed", "true");
  });
});
