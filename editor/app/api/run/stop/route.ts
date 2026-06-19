import { NextResponse } from "next/server";
import { stop } from "../session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/run/stop — stop the runner and clean up its config file. */
export async function POST() {
  return NextResponse.json(await stop());
}
