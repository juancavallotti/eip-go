"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MANAGEMENT_SECTIONS } from "@/app/components/integrations/views";

/**
 * The management area's section switcher: a segmented control of links across the
 * sibling routes (Integrations, Secrets, Queues, …), highlighting the one matching
 * the current path. Replaces the former in-page ViewTabs state now that each
 * section is its own route; rendered in the shared AppHeader on every management
 * page so the bar stays put as you move between them.
 */
export default function ManagementNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-0.5 rounded-md bg-black/[0.04] p-0.5 dark:bg-white/[0.06]">
      {MANAGEMENT_SECTIONS.map((s) => {
        const active = pathname === s.href || pathname.startsWith(`${s.href}/`);
        const Icon = s.icon;
        return (
          <Link
            key={s.key}
            href={s.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-sm font-medium transition-colors ${
              active
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            <Icon size={14} className="shrink-0" />
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}
