import {
  Webhook,
  Filter,
  Wand2,
  Split,
  Globe,
  Database,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

export interface PaletteComponent {
  id: string;
  label: string;
  icon: LucideIcon;
}

/**
 * The palette of integration building blocks. Static for now — extend this
 * array to add blocks; drag/drop onto the canvas is wired up later.
 */
export const PALETTE: PaletteComponent[] = [
  { id: "source", label: "Source", icon: Webhook },
  { id: "filter", label: "Filter", icon: Filter },
  { id: "transform", label: "Transform", icon: Wand2 },
  { id: "route", label: "Route", icon: Split },
  { id: "http", label: "HTTP", icon: Globe },
  { id: "database", label: "Database", icon: Database },
  { id: "log", label: "Log", icon: ScrollText },
];

export function findPaletteComponent(id: string | null): PaletteComponent | undefined {
  if (!id) return undefined;
  return PALETTE.find((c) => c.id === id);
}
