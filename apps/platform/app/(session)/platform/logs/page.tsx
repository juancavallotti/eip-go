import { Suspense } from "react";
import AppHeader from "@/app/components/AppHeader";
import ManagementNav from "@/app/components/ManagementNav";
import UserMenu from "@/app/components/UserMenu";
import LogsMonitor from "@/app/components/logs/LogsMonitor";

/**
 * The logs route (`/platform/logs`): a filterable, paginated view of the log
 * events deployments ship, behind the shared header with the management section
 * nav. A server component so it can hand the header the server-rendered account
 * tile, matching the sibling management routes; the monitor fetches client-side.
 */
export default function LogsPage() {
  return (
    <div className="flex h-full flex-col">
      <AppHeader userMenu={<UserMenu />}>
        <ManagementNav />
      </AppHeader>
      {/* LogsMonitor reads filters from the URL via useSearchParams, which needs a
          Suspense boundary. */}
      <Suspense>
        <LogsMonitor />
      </Suspense>
    </div>
  );
}
