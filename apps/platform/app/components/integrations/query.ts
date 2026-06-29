/**
 * URL <-> selection serialization for the integrations manager, so the selected
 * folder bucket and integration are bookmarkable (and the dashboard's "Manage"
 * link can deep-link one). Kept out of the component, mirroring the logs view's
 * query helpers.
 *
 * Folder ids are opaque (UUIDs), so "unfiled" is a safe sentinel for that bucket;
 * the default "all" bucket is encoded by omitting the param to keep URLs clean.
 */

import type { Bucket } from "./model";

export interface ManagerSelection {
  selectedId: string | null;
  bucket: Bucket;
}

/** Read the selection out of the URL query string. */
export function readSelection(sp: URLSearchParams): ManagerSelection {
  const folder = sp.get("folder");
  const bucket: Bucket = !folder
    ? "all"
    : folder === "unfiled"
      ? "unfiled"
      : { folder };
  return { selectedId: sp.get("integration"), bucket };
}

/** Serialize the selection into a query string, omitting the defaults. */
export function writeSelection(sel: ManagerSelection): string {
  const p = new URLSearchParams();
  if (sel.selectedId) p.set("integration", sel.selectedId);
  if (sel.bucket === "unfiled") p.set("folder", "unfiled");
  else if (typeof sel.bucket === "object") p.set("folder", sel.bucket.folder);
  return p.toString();
}
