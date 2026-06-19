import { NextResponse } from "next/server";
import { start, status } from "../session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/run/start { yaml } — render the config and (re)start the runner. */
export async function POST(req: Request) {
  if (!status().available) {
    return NextResponse.json(
      { error: "Runner not available (OCTO_BIN_PATH unset)." },
      { status: 409 },
    );
  }
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
    return NextResponse.json(await start(yaml));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
