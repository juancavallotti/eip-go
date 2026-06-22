import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import FolderPicker from "./FolderPicker";
import { EditorStateProvider } from "@/app/state/editorState";
import {
  FileSystemProvider,
  type FileSystemCapability,
} from "@/app/providers/FileSystemProvider";

const base: FileSystemCapability = {
  load: async () => ({ id: "x", name: "n", definition: "" }),
  save: async () => ({ id: "x", name: "n", definition: "" }),
};
const withFolders: FileSystemCapability = {
  ...base,
  folders: {
    list: async () => [],
    assign: async () => {},
    unassign: async () => {},
  },
};

function renderWith(value: FileSystemCapability) {
  return render(
    <EditorStateProvider>
      <FileSystemProvider value={value}>
        <FolderPicker />
      </FileSystemProvider>
    </EditorStateProvider>,
  );
}

describe("FolderPicker", () => {
  it("renders nothing when the capability has no folder support", () => {
    renderWith(base);
    expect(screen.queryByRole("button", { name: "Folder" })).toBeNull();
  });

  it("renders the folder trigger when folders are supported", () => {
    renderWith(withFolders);
    expect(
      screen.getByRole("button", { name: "Folder" }),
    ).toBeInTheDocument();
  });
});
