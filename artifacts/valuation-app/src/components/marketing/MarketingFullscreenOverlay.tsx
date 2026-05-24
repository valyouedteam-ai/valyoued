import { type ReactNode, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

const maxInner = {
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
} as const;

type InnerMaxWidth = keyof typeof maxInner;

export type MarketingFullscreenOverlayProps = {
  children: ReactNode;
  /** Use `landing` tint to mirror the homepage marketing overlays. */
  variant?: "onboarding" | "landing";
  innerMaxWidth?: InnerMaxWidth;
  className?: string;
  innerClassName?: string;
  /** Lock viewport scroll while this layer is mounted (default true). */
  lockScroll?: boolean;
};

/**
 * Full viewport layer for sequential onboarding overlays. Wrap with parent `AnimatePresence mode="wait"`
 * so each mounted instance crosses into the next.
 */
export function MarketingFullscreenOverlay({
  children,
  variant = "onboarding",
  innerMaxWidth = "lg",
  className,
  innerClassName,
  lockScroll = true,
}: MarketingFullscreenOverlayProps) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!lockScroll) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [lockScroll]);

  const shellBg =
    variant === "landing"
      ? "bg-[hsl(40,22%,96%)]/95"
      : "bg-[hsl(40,22%,96%)]/[0.96]";

  const shellClass = cn(
    "fixed inset-0 z-[130] overflow-y-auto overscroll-none backdrop-blur-md sm:flex sm:flex-col sm:justify-center",
    shellBg,
    className,
  );

  const inner = (
    <div className={cn("mx-auto w-full px-4 py-10 sm:px-6", maxInner[innerMaxWidth], innerClassName)}>{children}</div>
  );

  if (reduceMotion) {
    return (
      <div role="dialog" aria-modal="true" className={shellClass}>
        {inner}
      </div>
    );
  }

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      className={shellClass}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {inner}
    </motion.div>
  );
}
