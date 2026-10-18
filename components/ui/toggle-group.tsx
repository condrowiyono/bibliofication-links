"use client";

import * as React from "react";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

/** A segmented control: one choice out of a few, all visible at once. */
function ToggleGroup({ className, children, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return (
    <ToggleGroupPrimitive.Root data-slot="toggle-group" className={cn("flex w-full rounded-md border bg-muted p-0.5 shadow-xs", className)} {...props}>
      {children}
    </ToggleGroupPrimitive.Root>
  );
}

function ToggleGroupItem({ className, children, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(
        "inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[calc(var(--radius)-4px)] px-2 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-xs md:h-8 [&_svg]:size-4",
        className,
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
}

export { ToggleGroup, ToggleGroupItem };
