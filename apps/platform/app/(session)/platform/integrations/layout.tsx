import type { ReactNode } from "react";
import UserMenu from "@/app/components/UserMenu";
import { ConfirmProvider } from "@/app/components/ConfirmDialog";
import IntegrationsManager from "@/app/components/integrations/IntegrationsManager";

/**
 * Layout for the integration management routes. The data-heavy manager lives here,
 * not in the page, so navigating between selections — which change the [[...path]]
 * segment — preserves it instead of remounting and refetching: a layout is kept
 * across navigations within its segment (Next.js client-side navigation). The
 * selection lives in the URL; the manager reads it with usePathname and changes it
 * with the router, so the view is bookmarkable and navigates without a full reload.
 * The page underneath is a no-op marker that makes the dynamic route resolvable.
 */
export default function IntegrationsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ConfirmProvider>
      <IntegrationsManager userMenu={<UserMenu />} />
      {children}
    </ConfirmProvider>
  );
}
