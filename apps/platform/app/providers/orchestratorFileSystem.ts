/**
 * The platform's FileSystemCapability: backs the editor's load/save by the
 * orchestrator, through the browser client in `app/model/orchestrator.ts` (which
 * in turn proxies the BFF routes under `/api`). This is exactly the wiring the
 * editor components used inline before the capability was extracted.
 */

import {
  assignIntegration,
  createIntegration,
  findIntegrationFolderId,
  getIntegration,
  listFolders,
  listIntegrations,
  unassignIntegration,
  updateIntegration,
} from "@/app/model/orchestrator";
import type { FileSystemCapability } from "@octo/editor";

export const orchestratorFileSystem: FileSystemCapability = {
  async load(id) {
    // The integration record doesn't carry its folder, so resolve it from
    // membership (single-membership tree). Matches the old IntegrationLoader.
    const [integration, folderId] = await Promise.all([
      getIntegration(id),
      findIntegrationFolderId(id),
    ]);
    return {
      id: integration.id,
      name: integration.name,
      definition: integration.definition,
      folderId,
      lastUpdated: integration.lastUpdated,
    };
  },

  async save(id, { name, definition, folderId }) {
    if (id) {
      // Updates don't move folders here (the folder picker applies that live);
      // pass the known folderId back through for the saved snapshot.
      const updated = await updateIntegration(id, { name, definition });
      return { ...updated, folderId: folderId ?? null };
    }
    const created = await createIntegration({ name, definition });
    if (folderId) await assignIntegration(folderId, created.id);
    return { ...created, folderId: folderId ?? null };
  },

  async list() {
    return listIntegrations();
  },

  folders: {
    list: () => listFolders(),
    assign: (folderId, documentId) => assignIntegration(folderId, documentId),
    unassign: (folderId, documentId) =>
      unassignIntegration(folderId, documentId),
  },
};
