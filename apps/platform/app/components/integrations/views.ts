/**
 * The top-level sections of the management area, each now its own route. Kept in a
 * plain (non-"use client") module so both the server route pages and the client
 * nav import the real array, not a client-reference proxy. Add `/logs` here when it
 * lands and it appears in the nav everywhere.
 */
export const MANAGEMENT_SECTIONS = [
  {
    key: "integrations",
    label: "Integrations",
    href: "/platform/integrations",
  },
  { key: "secrets", label: "Secrets", href: "/platform/secrets" },
  { key: "queues", label: "Queues", href: "/platform/queues" },
] as const;

export type ManagementSection = (typeof MANAGEMENT_SECTIONS)[number];
export type ManagementSectionKey = ManagementSection["key"];
