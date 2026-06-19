import { NextResponse } from "next/server";
import { sync } from "../session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/run/sync { yaml } — rewrite the watched config so the runner reloads. */
export async function POST(req: Request) {
  let yaml: unknown;
  try {
    yaml = (await req.json())?.yaml;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (typeof yaml !== "string" || yaml.trim() === "") {
    return NextResponse.json({ error: "missing `yaml`" }, { status: 400 });
  }
  try {
    return NextResponse.json(await sync(yaml));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
