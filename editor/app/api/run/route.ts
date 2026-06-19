import { NextResponse } from "next/server";
import { status } from "./session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/run — whether RUN is available and whether a runner is live. */
export function GET() {
  return NextResponse.json(status());
}
