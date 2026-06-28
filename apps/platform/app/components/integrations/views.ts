import { KeyRound, LayoutGrid, Network, ScrollText } from "lucide-react";

/**
 * The top-level sections of the management area, each now its own route. Kept in a
 * plain (non-"use client") module so both the server route pages and the client
 * nav import the real array, not a client-reference proxy. Each carries the icon
 * the nav renders next to its label (matching the dashboard shortcut icons).
 */
export const MANAGEMENT_SECTIONS = [
  {
    key: "integrations",
    label: "Integrations",
    href: "/platform/integrations",
    icon: LayoutGrid,
  },
  { key: "secrets", label: "Secrets", href: "/platform/secrets", icon: KeyRound },
  { key: "queues", label: "Queues", href: "/platform/queues", icon: Network },
  { key: "logs", label: "Logs", href: "/platform/logs", icon: ScrollText },
] as const;

export type ManagementSection = (typeof MANAGEMENT_SECTIONS)[number];
export type ManagementSectionKey = ManagementSection["key"];
