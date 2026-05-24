import { useEffect, useState } from "react";
import { Link } from "wouter";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";

const INTRO_STORAGE_KEY = "valyoued.landingIntroSeen";

/** Min time before the overlay can arm so hero and Globe paint first. */
const LANDING_INTRO_ARM_DELAY_MS = 1400;

type LandingIntroOverlayProps = {
  /**
   * When true, the observer (or landing page) considers the viewer far enough along to show the opener.
   * Typically flips once the sentinel between hero and feature cards crosses into view after a short dwell.
   */
  unlocked: boolean;
};

/**
 * One-time per-tab splash plus signup framing. Designed to mount after unlock so the headline and Globe render first.
 */
export function LandingIntroOverlay({ unlocked }: LandingIntroOverlayProps) {
  const reduceMotion = useReducedMotion();
  const [armed, setArmed] = useState(false);
  const [phase, setPhase] = useState<"splash" | "cta" | "done">("done");

  /** Arm splash only after landing has had a beat to settle; never block first paint above the fold. */
  useEffect(() => {
    if (reduceMotion || !unlocked) return;
    const t = window.setTimeout(() => setArmed(true), LANDING_INTRO_ARM_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [reduceMotion, unlocked]);

  useEffect(() => {
    if (reduceMotion || !armed) return;
    try {
      const seen = sessionStorage.getItem(INTRO_STORAGE_KEY);
      if (!seen) setPhase("splash");
    } catch {
      setPhase("done");
    }
  }, [reduceMotion, armed]);

  useEffect(() => {
    if (phase !== "splash" || reduceMotion) return;
    const t = window.setTimeout(() => setPhase("cta"), 1200);
    return () => window.clearTimeout(t);
  }, [phase, reduceMotion]);

  function dismissToLanding() {
    try {
      sessionStorage.setItem(INTRO_STORAGE_KEY, "done");
    } catch {
      /* ignore */
    }
    setPhase("done");
  }

  if (reduceMotion || phase === "done") return null;

  return (
    <AnimatePresence>
      <motion.div
        key="intro-shell"
        className="fixed inset-0 z-[100] flex items-center justify-center bg-[hsl(40,22%,96%)]/95 p-4 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="landing-intro-title"
      >
        <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-8 text-center">
          {phase === "splash" ? (
            <motion.div
              className="space-y-3"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
            >
              <p id="landing-intro-title" className="font-brand text-4xl font-semibold tracking-tight text-foreground">
                ValYoued
              </p>
              <p className="text-sm text-muted-foreground">
                Understand what you own, follow value when you want it, draft listings without starting from scratch.
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full space-y-5"
            >
              <div className="space-y-3">
                <p className="text-xl font-semibold tracking-tight text-foreground">What happens next</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Create a free account when you&apos;re ready. Right after signup we explain the basics in plain language and ask
                  how you&apos;ll mostly use ValYoued. Nothing here locks you into a paid plan.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button type="button" variant="outline" size="lg" className="w-full rounded-full sm:w-auto" onClick={dismissToLanding}>
                  Continue browsing
                </Button>
                <Link href="/sign-up" className="w-full sm:w-auto" onClick={dismissToLanding}>
                  <Button variant="default" size="lg" className="w-full rounded-full">
                    Create free account
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
