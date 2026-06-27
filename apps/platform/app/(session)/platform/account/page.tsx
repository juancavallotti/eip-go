import AppHeader from "@/app/components/AppHeader";
import UserMenu from "@/app/components/UserMenu";
import { ConfirmProvider } from "@/app/components/ConfirmDialog";
import ApiKeysManager from "@/app/components/account/ApiKeysManager";

/**
 * The account route (`/platform/account`): per-user settings behind the shared
 * header. Currently a single section — API keys — reached from the user menu. A
 * server component so it can hand the client manager the server-rendered account
 * tile, matching the other management routes.
 */
export default function AccountPage() {
  return (
    <div className="flex h-full flex-col">
      <AppHeader userMenu={<UserMenu />} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ConfirmProvider>
          <ApiKeysManager />
        </ConfirmProvider>
      </div>
    </div>
  );
}
