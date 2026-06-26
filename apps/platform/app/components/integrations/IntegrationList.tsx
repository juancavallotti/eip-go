"use client";

import { useDraggable } from "@dnd-kit/core";
import { Workflow } from "lucide-react";
import type { Integration } from "@/app/model/orchestrator";
import type { DragData } from "./model";

/** The middle column: the selected bucket's integrations, selectable into the detail panel. */
interface Props {
  integrations: Integration[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function IntegrationList({
  integrations,
  selectedId,
  onSelect,
}: Props) {
  return (
    <div className="flex w-72 shrink-0 flex-col border-r border-black/10 dark:border-white/10">
      {integrations.length === 0 ? (
        <p className="px-4 py-4 text-sm text-zinc-400">No integrations here.</p>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto py-1">
          {integrations.map((i) => (
            <IntegrationCard
              key={i.id}
              integration={i}
              selected={selectedId === i.id}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * One draggable integration row. Dragging it onto a folder (or "Unfiled") in the
 * tree files/unfiles it; a plain click still selects it (a small activation
 * distance on the pointer sensor keeps clicks and drags distinct).
 */
function IntegrationCard({
  integration: i,
  selected,
  onSelect,
}: {
  integration: Integration;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const data: DragData = { kind: "integration", id: i.id, name: i.name };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `integration:${i.id}`,
    data,
  });

  return (
    <li>
      <button
        ref={setNodeRef}
        type="button"
        onClick={() => onSelect(i.id)}
        {...attributes}
        {...listeners}
        className={`flex w-full items-center gap-3 px-4 py-2 text-left ${
          isDragging ? "opacity-40" : ""
        } ${
          selected
            ? "bg-sky-500/10"
            : "hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
        }`}
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
            selected
              ? "bg-sky-500/15 text-sky-600 dark:text-sky-400"
              : "bg-black/[0.04] text-zinc-500 dark:bg-white/[0.06] dark:text-zinc-400"
          }`}
        >
          <Workflow size={16} />
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-sm font-medium">{i.name}</span>
          <span className="text-xs text-zinc-400">
            {new Date(i.lastUpdated).toLocaleDateString()}
          </span>
        </span>
      </button>
    </li>
  );
}
