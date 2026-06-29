import { Suspense } from "react";
import UserMenu from "@/app/components/UserMenu";
import { ConfirmProvider } from "@/app/components/ConfirmDialog";
import IntegrationsManager from "@/app/components/integrations/IntegrationsManager";

/**
 * The integration management route (`/platform/integrations`): the file manager and
 * deployments, behind the shared header. A server component so it can hand the
 * client manager the server-rendered account tile; `?integration=<id>` preselects
 * an integration and `?folder=<id|unfiled>` the bucket, so a selection is
 * bookmarkable. The manager mirrors its selection back to the URL and reads it via
 * useSearchParams, which needs a Suspense boundary. Secrets and queues are sibling
 * routes, reached via the ManagementNav in the header.
 */
export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ integration?: string }>;
}) {
  const { integration } = await searchParams;
  return (
    <ConfirmProvider>
      <Suspense>
        <IntegrationsManager
          initialSelectedId={integration ?? null}
          userMenu={<UserMenu />}
        />
      </Suspense>
    </ConfirmProvider>
  );
}
