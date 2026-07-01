import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditorStateProvider } from "../state/editorState";
import ViewModeToggle from "./ViewModeToggle";

function renderToggle() {
  return render(
    <EditorStateProvider>
      <ViewModeToggle />
    </EditorStateProvider>,
  );
}

describe("ViewModeToggle", () => {
  it("starts on Canvas and switches to YAML on click", async () => {
    renderToggle();
    const canvas = screen.getByRole("button", { name: "Canvas" });
    const yaml = screen.getByRole("button", { name: "YAML" });

    expect(canvas).toHaveAttribute("aria-pressed", "true");
    expect(yaml).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(yaml);

    expect(yaml).toHaveAttribute("aria-pressed", "true");
    expect(canvas).toHaveAttribute("aria-pressed", "false");
  });
});
