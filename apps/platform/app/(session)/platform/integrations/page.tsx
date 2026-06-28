import UserMenu from "@/app/components/UserMenu";
import { ConfirmProvider } from "@/app/components/ConfirmDialog";
import IntegrationsManager from "@/app/components/integrations/IntegrationsManager";

/**
 * The integration management route (`/platform/integrations`): the file manager and
 * deployments, behind the shared header. A server component so it can hand the
 * client manager the server-rendered account tile; `?integration=<id>` preselects
 * an integration (used by the dashboard tiles' "Manage"). Secrets and queues are
 * sibling routes, reached via the ManagementNav in the header.
 */
export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ integration?: string }>;
}) {
  const { integration } = await searchParams;
  return (
    <ConfirmProvider>
      <IntegrationsManager
        initialSelectedId={integration ?? null}
        userMenu={<UserMenu />}
      />
    </ConfirmProvider>
  );
}
