import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { FieldSpec } from "../schema/types";
import SettingsField from "./SettingsField";

// SettingsField pulls in the env-var picker, which reads the editor state; the
// object-field tests never enter env mode, but stub it so the module is safe to
// import and render in isolation.
vi.mock("../state/editorState", () => ({
  useEditorState: () => ({
    state: { document: { connectors: [], flows: [], processors: [], env: [] } },
    dispatch: () => {},
  }),
  EditorActionType: {},
}));

// A pared-down version of the http-client `auth` object field: an enum that gates
// which sub-fields show.
const authField: FieldSpec = {
  name: "auth",
  label: "Authentication",
  type: "object",
  required: false,
  fields: [
    {
      name: "type",
      label: "Type",
      type: "enum",
      required: false,
      enum: ["bearer", "basic", "oauth2"],
    },
    {
      name: "token",
      label: "Bearer token",
      type: "string",
      required: false,
      showIf: { field: "type", equals: "bearer" },
    },
    {
      name: "tokenURL",
      label: "Token URL",
      type: "string",
      required: false,
      showIf: { field: "type", equals: "oauth2" },
    },
    {
      name: "clientID",
      label: "Client ID",
      type: "string",
      required: false,
      showIf: { field: "type", equals: "oauth2" },
    },
  ],
};

describe("SettingsField object group", () => {
  it("hides every conditional sub-field until its type is selected", () => {
    render(<SettingsField field={authField} value={{}} onChange={() => {}} />);
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.queryByText("Bearer token")).toBeNull();
    expect(screen.queryByText("Token URL")).toBeNull();
  });

  it("shows only the sub-fields matching the selected type", () => {
    render(
      <SettingsField
        field={authField}
        value={{ type: "oauth2" }}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("Token URL")).toBeInTheDocument();
    expect(screen.getByText("Client ID")).toBeInTheDocument();
    expect(screen.queryByText("Bearer token")).toBeNull();
  });

  it("merges a sub-field edit back into the object value", () => {
    const onChange = vi.fn();
    render(
      <SettingsField
        field={authField}
        value={{ type: "bearer" }}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "secret-token" },
    });
    expect(onChange).toHaveBeenCalledWith({
      type: "bearer",
      token: "secret-token",
    });
  });
});
