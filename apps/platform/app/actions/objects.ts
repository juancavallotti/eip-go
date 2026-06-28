"use server";

/**
 * Server actions for the deployment-scoped object store (the user-facing "user" KV
 * namespace). Each action authorizes and delegates to the orchestrator client lib;
 * the model unwraps the ActionResult. The orchestrator fixes the namespace, so the
 * BFF never names it.
 */

import type { ObjectEntry, ObjectValue } from "@/app/model/objects";
import { withRead, withWrite } from "./_auth";
import * as client from "./_client";
import type { ActionResult } from "./_client";

export async function listObjects(
  deploymentId: string,
): Promise<ActionResult<ObjectEntry[]>> {
  return withRead(() => client.listObjects(deploymentId));
}

export async function getObject(
  deploymentId: string,
  key: string,
): Promise<ActionResult<ObjectValue>> {
  return withRead(() => client.getObject(deploymentId, key));
}

export async function setObject(
  deploymentId: string,
  key: string,
  value: string,
  version: number,
  encoding: "utf8" | "base64" = "utf8",
): Promise<ActionResult<number>> {
  return withWrite(() =>
    client.setObject(deploymentId, key, value, version, encoding),
  );
}

export async function deleteObject(
  deploymentId: string,
  key: string,
  version = 0,
): Promise<ActionResult<void>> {
  return withWrite(() => client.deleteObject(deploymentId, key, version));
}
