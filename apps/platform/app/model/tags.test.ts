import { describe, expect, it } from "vitest";
import { DEFAULT_TAG, suggestNextTag } from "./tags";

describe("suggestNextTag", () => {
  it("defaults when there are no tags", () => {
    expect(suggestNextTag([])).toBe(DEFAULT_TAG);
  });

  it("defaults when no tag parses as a version", () => {
    expect(suggestNextTag(["release", "beta", "v1.2.3-rc1"])).toBe(DEFAULT_TAG);
  });

  it("bumps the revision (last segment) of a three-part tag", () => {
    expect(suggestNextTag(["v1.2.3"])).toBe("v1.2.4");
  });

  it("preserves segment count when bumping a two-part tag", () => {
    expect(suggestNextTag(["v1.0"])).toBe("v1.1");
  });

  it("bumps a bare integer tag", () => {
    expect(suggestNextTag(["3"])).toBe("4");
  });

  it("preserves absence of the v prefix", () => {
    expect(suggestNextTag(["1.4.9"])).toBe("1.4.10");
  });

  it("picks the numerically highest tag, not lexical", () => {
    // "v1.9.0" < "v1.10.0" numerically, though it sorts after as a string.
    expect(suggestNextTag(["v1.9.0", "v1.10.0", "v1.2.0"])).toBe("v1.10.1");
  });

  it("ignores unparseable tags when a valid one exists", () => {
    expect(suggestNextTag(["latest", "v2.0.0", "wip"])).toBe("v2.0.1");
  });

  it("handles a mix of prefixed and bare tags by numeric order", () => {
    expect(suggestNextTag(["v1.0.0", "2.0.0"])).toBe("2.0.1");
  });
});
