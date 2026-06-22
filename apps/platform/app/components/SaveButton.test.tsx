import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import SaveButton from "./SaveButton";
import { EditorStateProvider } from "@/app/state/editorState";
import {
  FileSystemProvider,
  type FileSystemCapability,
} from "@/app/providers/FileSystemProvider";

// A fake capability injected via context — no module mocking needed, which is
// the point of the FileSystemProvider seam.
const fakeFs: FileSystemCapability = {
  load: async () => ({ id: "x", name: "n", definition: "" }),
  save: async () => ({ id: "x", name: "n", definition: "" }),
};

function renderWith(value: FileSystemCapability | null) {
  return render(
    <EditorStateProvider>
      <FileSystemProvider value={value}>
        <SaveButton />
      </FileSystemProvider>
    </EditorStateProvider>,
  );
}

describe("SaveButton", () => {
  it("renders nothing without a filesystem capability", () => {
    renderWith(null);
    expect(screen.queryByRole("button", { name: /save/i })).toBeNull();
  });

  it("renders the Save control when a filesystem capability is provided", () => {
    renderWith(fakeFs);
    expect(
      screen.getByRole("button", { name: /save/i }),
    ).toBeInTheDocument();
  });
});
