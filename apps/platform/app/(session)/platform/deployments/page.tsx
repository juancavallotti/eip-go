import AppHeader from "@/app/components/AppHeader";
import ManagementNav from "@/app/components/ManagementNav";
import UserMenu from "@/app/components/UserMenu";
import DeploymentsMonitor from "@/app/components/deployments/DeploymentsMonitor";

/**
 * The deployments route (`/platform/deployments`): every active deployment across
 * all integrations with live status, behind the shared header and section nav. A
 * server component so it can hand the header the server-rendered account tile,
 * matching the sibling routes; the monitor fetches client-side.
 */
export default function DeploymentsPage() {
  return (
    <div className="flex h-full flex-col">
      <AppHeader userMenu={<UserMenu />}>
        <ManagementNav />
      </AppHeader>
      <DeploymentsMonitor />
    </div>
  );
}
