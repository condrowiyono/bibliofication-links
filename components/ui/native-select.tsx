import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** A styled native <select>: on phones it opens the system picker, which beats any custom popover. */
function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative w-full">
      <select
        data-slot="native-select"
        className={cn(
          "h-11 w-full appearance-none rounded-md border border-input bg-background py-1 pr-9 pl-3 text-base shadow-xs disabled:cursor-not-allowed disabled:opacity-50 md:h-9 md:text-sm",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
    </div>
  );
}

export { NativeSelect };
