/**
 * Client-side helpers for the file manager's YAML import/export. An integration's
 * `definition` is already the runtime YAML, so exporting is just offering that
 * string as a file, and importing reads a file back into a new integration (its
 * name taken from the filename). See issue #61.
 */

/** Slugify a display name into a safe filename stem (falls back to "integration"). */
function slug(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "integration";
}

/**
 * Trigger a browser download of an integration's definition as `<slug>.yaml`.
 * Builds an object URL from a Blob and clicks a transient anchor, then revokes it.
 */
export function downloadDefinition(name: string, definition: string): void {
  const blob = new Blob([definition], { type: "application/yaml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug(name)}.yaml`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Derive an integration name from an uploaded filename (strip path and .yaml/.yml). */
export function nameFromFilename(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? filename;
  const stem = base.replace(/\.ya?ml$/i, "").trim();
  return stem || "Imported integration";
}
