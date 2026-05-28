import { useEffect, useState } from "react";
import { Link } from "wouter";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const INTRO_STORAGE_KEY = "valyoued.landingIntroSeen";

type LandingIntroOverlayProps = {
  /**
   * When true, the viewer has scrolled far enough through the landing story to show the signup nudge.
   */
  unlocked: boolean;
};

/**
 * One-time per-tab bottom banner after the product walkthrough. Non-blocking: users can keep browsing.
 */
export function LandingIntroOverlay({ unlocked }: LandingIntroOverlayProps) {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (reduceMotion || !unlocked) return;
    try {
      if (sessionStorage.getItem(INTRO_STORAGE_KEY)) return;
    } catch {
      return;
    }
    const t = window.setTimeout(() => setVisible(true), 600);
    return () => window.clearTimeout(t);
  }, [reduceMotion, unlocked]);

  function dismiss() {
    try {
      sessionStorage.setItem(INTRO_STORAGE_KEY, "done");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (reduceMotion || !visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="intro-banner"
        className="fixed inset-x-0 bottom-0 z-[100] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.35 }}
        role="dialog"
        aria-modal="false"
        aria-labelledby="landing-intro-title"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-2xl border border-border/80 bg-card/95 p-4 shadow-2xl backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5">
          <div className="min-w-0 flex-1 space-y-1 pr-8 sm:pr-0">
            <p id="landing-intro-title" className="text-base font-semibold tracking-tight text-foreground">
              Ready when you are
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Create a free account to save valuations and pick Everyday or Professional wording. No paid plan required to
              start.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
            <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={dismiss}>
              Continue browsing
            </Button>
            <Link href="/sign-up" onClick={dismiss}>
              <Button size="sm" className="w-full rounded-full sm:w-auto">
                Create free account
              </Button>
            </Link>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:right-4 sm:top-4"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
