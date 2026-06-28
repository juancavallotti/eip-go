"use server";

/**
 * Server action for platform queue monitoring. Authorizes (any signed-in caller)
 * and delegates to the NATS monitoring client (`_nats.ts`), which reads the
 * broker's HTTP monitoring endpoints directly. The model unwraps the
 * ActionResult. Read-only — there is nothing to mutate here.
 */

import type { QueueStats } from "@/app/model/queues";
import { withRead } from "./_auth";
import * as nats from "./_nats";
import type { ActionResult } from "./_client";

export async function listQueueStats(): Promise<ActionResult<QueueStats>> {
  return withRead(() => nats.getQueueStats());
}
