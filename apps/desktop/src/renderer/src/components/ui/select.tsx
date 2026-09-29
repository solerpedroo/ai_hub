import { ChevronDown } from "lucide-react";
import { type SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <span className="relative inline-flex min-w-0 items-center">
      <select
        ref={ref}
        className={cn(
          "h-8 min-w-0 appearance-none rounded-lg border border-input bg-background/80 py-1 pl-2.5 pr-8 text-[12px] text-foreground shadow-sm outline-none transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-muted-foreground"
      />
    </span>
  ),
);

Select.displayName = "Select";
