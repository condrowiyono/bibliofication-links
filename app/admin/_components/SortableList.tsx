"use client";

import * as React from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

type Handle = { disabled: boolean; label: string } & Pick<ReturnType<typeof useSortable>, "attributes" | "listeners" | "setActivatorNodeRef">;

/**
 * A list you reorder by dragging the grip on each row (mouse, touch or keyboard: focus the grip, press
 * Space, move with the arrow keys, Space again). Only the grip starts a drag, so scrolling stays normal on phones.
 */
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  disabled = false,
  itemLabel,
  className,
}: {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, handle: React.ReactNode, dragging: boolean) => React.ReactNode;
  disabled?: boolean;
  itemLabel: (item: T) => string;
  className?: string;
}) {
  // A fixed id keeps dnd-kit's screen-reader ids the same on the server and in the browser.
  const dndId = React.useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((x) => x.id === active.id);
    const to = items.findIndex((x) => x.id === over.id);
    onReorder(arrayMove(items, from, to));
  };

  const label = (id: string | number) => itemLabel(items.find((x) => x.id === id) ?? items[0]);

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={onDragEnd}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `Picked up ${label(active.id)}.`,
          onDragOver: ({ active, over }) => (over ? `${label(active.id)} is now at position ${items.findIndex((x) => x.id === over.id) + 1}.` : ""),
          onDragEnd: ({ active, over }) => (over ? `Dropped ${label(active.id)} at position ${items.findIndex((x) => x.id === over.id) + 1}.` : ""),
          onDragCancel: ({ active }) => `Cancelled. ${label(active.id)} stays where it was.`,
        },
      }}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy} disabled={disabled}>
        <ul className={cn("flex flex-col gap-2", className)}>
          {items.map((item) => (
            <SortableItem key={item.id} id={item.id} disabled={disabled} label={itemLabel(item)}>
              {(handle, dragging) => renderItem(item, handle, dragging)}
            </SortableItem>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({
  id,
  disabled,
  label,
  children,
}: {
  id: string;
  disabled: boolean;
  label: string;
  children: (handle: React.ReactNode, dragging: boolean) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("relative", isDragging && "z-10")}
    >
      {children(<DragHandle attributes={attributes} listeners={listeners} setActivatorNodeRef={setActivatorNodeRef} disabled={disabled} label={label} />, isDragging)}
    </li>
  );
}

function DragHandle({ attributes, listeners, setActivatorNodeRef, disabled, label }: Handle) {
  return (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      disabled={disabled}
      aria-label={`Reorder ${label}`}
      title={disabled ? "Clear the search to reorder" : "Drag to reorder"}
      className="flex w-10 shrink-0 cursor-grab touch-none items-center justify-center self-stretch rounded-l-xl text-muted-foreground hover:text-foreground active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-30 md:w-8"
    >
      <GripVertical className="size-5 md:size-4" />
    </button>
  );
}
