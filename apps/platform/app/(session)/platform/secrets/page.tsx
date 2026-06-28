import AppHeader from "@/app/components/AppHeader";
import ManagementNav from "@/app/components/ManagementNav";
import UserMenu from "@/app/components/UserMenu";
import { ConfirmProvider } from "@/app/components/ConfirmDialog";
import SecretsManager from "@/app/components/integrations/SecretsManager";

/**
 * The secrets management route (`/platform/secrets`): the cluster-wide secret
 * catalog, behind the shared header with the management section nav. A server
 * component so it can hand the header the server-rendered account tile, matching
 * the sibling integrations route.
 */
export default function SecretsPage() {
  return (
    <div className="flex h-full flex-col">
      <AppHeader userMenu={<UserMenu />}>
        <ManagementNav />
      </AppHeader>
      <div className="min-h-0 flex-1">
        <ConfirmProvider>
          <SecretsManager />
        </ConfirmProvider>
      </div>
    </div>
  );
}
