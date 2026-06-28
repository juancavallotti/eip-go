import AppHeader from "@/app/components/AppHeader";
import ManagementNav from "@/app/components/ManagementNav";
import UserMenu from "@/app/components/UserMenu";
import QueuesMonitor from "@/app/components/queues/QueuesMonitor";

/**
 * The queue monitoring route (`/platform/queues`): a live view of the platform's
 * NATS broker, behind the shared header with the management section nav. A server
 * component so it can hand the header the server-rendered account tile, matching
 * the sibling management routes; the monitor itself polls client-side.
 */
export default function QueuesPage() {
  return (
    <div className="flex h-full flex-col">
      <AppHeader userMenu={<UserMenu />}>
        <ManagementNav />
      </AppHeader>
      <QueuesMonitor />
    </div>
  );
}
