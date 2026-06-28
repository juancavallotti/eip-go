import { redirect } from "next/navigation";
import { auth, authEnabled } from "@/auth";

/**
 * Render every signed-in route per request. The account tile (UserMenu) reads the
 * session via `auth()`, so a statically prerendered page would bake in the
 * signed-out placeholder — the cause of the blank account circle on routes that
 * touch no other dynamic API (the dashboard, `/platform/new`). Forcing it here, at
 * the shared session boundary, covers them all rather than per page.
 */
export const dynamic = "force-dynamic";

/**
 * Layout for the signed-in platform (dashboard, editor, file manager). The proxy
 * middleware already gates these routes, but we re-check here as defense in depth
 * and to guarantee a session exists for the server-rendered account tile — a
 * missing one bounces to the public welcome page. When SSO is disabled (local
 * dev) the check is skipped and the platform is open.
 *
 * Each page composes its own header from the shared AppLogo + account tile, so
 * this layout only owns the full-height shell.
 */
export default async function SessionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (authEnabled) {
    const session = await auth();
    if (!session?.user) redirect("/");
  }
  return <div className="flex h-full flex-1 flex-col">{children}</div>;
}
