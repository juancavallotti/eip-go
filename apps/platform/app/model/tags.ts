/**
 * Version-tag suggestions for the editor's Tag and Deploy controls. Version tags
 * (snapshots) are freeform strings, but conventionally semver-shaped, so we suggest
 * the next one by bumping the revision (last numeric segment) of the highest
 * existing tag — the user can always edit it before saving.
 */

/** Default tag suggested when an integration has no parseable tags yet. */
export const DEFAULT_TAG = "v1.0.0";

/** A tag we could read as an ordered list of numbers, plus how to render it back. */
interface ParsedTag {
  /** Whether the original carried a leading `v`/`V`, preserved in the suggestion. */
  prefix: string;
  /** The dot-separated numeric segments, e.g. [1, 2, 3] for "v1.2.3". */
  parts: number[];
}

/**
 * Parse a semver-shaped tag: an optional `v` prefix followed by dot-separated
 * non-negative integers (e.g. `v1.2.3`, `2.0`, `v4`). Returns null for anything
 * else (pre-release suffixes, letters, empty), so unparseable tags are ignored.
 */
function parse(tag: string): ParsedTag | null {
  const m = /^(v?)(\d+(?:\.\d+)*)$/i.exec(tag.trim());
  if (!m) return null;
  return { prefix: m[1], parts: m[2].split(".").map((n) => Number(n)) };
}

/** Compare two parsed tags numerically, segment by segment (shorter loses ties). */
function compare(a: ParsedTag, b: ParsedTag): number {
  const len = Math.max(a.parts.length, b.parts.length);
  for (let i = 0; i < len; i++) {
    const diff = (a.parts[i] ?? 0) - (b.parts[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Suggest the next version tag given the existing ones. Bumps the revision (the
 * last numeric segment) of the highest parseable tag, preserving its `v` prefix and
 * segment count (`v1.2.3` → `v1.2.4`, `v1.0` → `v1.1`, `3` → `4`). When no tag
 * parses as a version, falls back to {@link DEFAULT_TAG}.
 */
export function suggestNextTag(existingTags: string[]): string {
  const parsed = existingTags
    .map(parse)
    .filter((p): p is ParsedTag => p !== null);
  if (parsed.length === 0) return DEFAULT_TAG;

  const highest = parsed.reduce((best, cur) =>
    compare(cur, best) > 0 ? cur : best,
  );
  const next = [...highest.parts];
  next[next.length - 1] += 1;
  return `${highest.prefix}${next.join(".")}`;
}
