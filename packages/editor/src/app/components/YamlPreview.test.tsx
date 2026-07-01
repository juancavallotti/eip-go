import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { EditorStateProvider } from "../state/editorState";
import YamlPreview from "./YamlPreview";

describe("YamlPreview", () => {
  it("renders the document as Prism-highlighted YAML", () => {
    const { container } = render(
      <EditorStateProvider>
        <YamlPreview />
      </EditorStateProvider>,
    );

    const pre = container.querySelector("pre.octo-yaml-preview");
    expect(pre).not.toBeNull();
    // The serialized definition always carries a service block…
    expect(pre?.textContent).toContain("service");
    // …and Prism emits token spans we theme in editor.css.
    expect(container.querySelector(".token")).not.toBeNull();
  });
});
