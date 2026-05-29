import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PhoneFrameProps = {
  children: ReactNode;
  className?: string;
  /** Compact frame for hero placement */
  size?: "default" | "compact";
};

/**
 * CSS-only iPhone-style device frame for marketing mock screens.
 */
export function PhoneFrame({ children, className, size = "default" }: PhoneFrameProps) {
  const compact = size === "compact";

  return (
    <div
      className={cn(
        "relative mx-auto shrink-0",
        compact ? "w-[220px]" : "w-[280px]",
        className,
      )}
    >
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-[2.25rem] border border-white/10 bg-[hsl(222,32%,8%)] shadow-2xl ring-1 ring-black/20",
          compact ? "rounded-[2rem]" : "rounded-[2.5rem]",
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 rounded-full bg-black",
            compact ? "top-2 h-4 w-16" : "top-3 h-5 w-24",
          )}
          aria-hidden
        />
        <div
          className={cn(
            "relative z-0 overflow-hidden bg-[hsl(222,28%,11%)]",
            compact ? "mx-1.5 mb-1.5 mt-9 rounded-[1.5rem]" : "mx-2 mb-2 mt-12 rounded-[2rem]",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
