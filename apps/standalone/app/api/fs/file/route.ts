import { NextResponse } from "next/server";
import { readFlow, updateFlow, writeFlow } from "../store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/fs/file?path=<id> — read one flow ({ id, name, definition }). */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("path");
  if (!id) {
    return NextResponse.json({ error: "missing `path`" }, { status: 400 });
  }
  try {
    return NextResponse.json(await readFlow(id));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 404 });
  }
}

/**
 * PUT /api/fs/file?path=<id> { name?, definition } — overwrite an existing flow.
 * When `name` is given and its slug differs from the current filename the flow is
 * renamed on disk (the response carries the new id).
 */
export async function PUT(req: Request) {
  const id = new URL(req.url).searchParams.get("path");
  if (!id) {
    return NextResponse.json({ error: "missing `path`" }, { status: 400 });
  }
  let body: { name?: unknown; definition?: unknown };
  try {
    body = (await req.json()) ?? {};
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (typeof body.definition !== "string") {
    return NextResponse.json({ error: "missing `definition`" }, { status: 400 });
  }
  const definition = body.definition;
  try {
    const stored =
      typeof body.name === "string"
        ? await updateFlow(id, body.name, definition)
        : await writeFlow(id, definition);
    return NextResponse.json(stored);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
