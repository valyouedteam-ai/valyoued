import { useEffect, useState } from "react";
import { Link } from "wouter";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BriefcaseBusiness, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PERSONA_SESSION_KEY,
  type SellerPersonaChoice,
} from "@/hooks/use-persona-sync";

const INTRO_STORAGE_KEY = "valyoued.landingIntroSeen";

function persistPersona(choice: SellerPersonaChoice) {
  try {
    sessionStorage.setItem(PERSONA_SESSION_KEY, choice);
  } catch {
    /* ignore */
  }
}

/**
 * Runs once per tab after first landing visit: personalised opener then track snapshot.
 */
export function LandingIntroOverlay() {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<"splash" | "persona" | "done">("done");

  useEffect(() => {
    if (reduceMotion) return;
    try {
      const seen = sessionStorage.getItem(INTRO_STORAGE_KEY);
      if (!seen) setPhase("splash");
    } catch {
      setPhase("done");
    }
  }, [reduceMotion]);

  useEffect(() => {
    if (phase !== "splash" || reduceMotion) return;
    const t = window.setTimeout(() => setPhase("persona"), 1200);
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

  function pickTrack(choice: SellerPersonaChoice) {
    persistPersona(choice);
    dismissToLanding();
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
              <p className="text-sm text-muted-foreground">Personal net worth desks and resale timing in one place.</p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full space-y-4"
            >
              <p id="landing-intro-persona-heading" className="text-xl font-semibold tracking-tight text-foreground">
                Tell us where you&apos;re headed first
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                We lighten the onboarding path you see after sign-up. Switch tracks anytime inside your profile.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <motion.button
                  type="button"
                  className="flex flex-col items-start rounded-2xl border border-border/70 bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/40"
                  onClick={() => pickTrack("everyday")}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  aria-describedby="landing-intro-persona-heading"
                >
                  <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
                    <Shirt className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="font-semibold text-foreground">Everyday steward</span>
                  <span className="mt-2 text-xs text-muted-foreground">Portfolio building, wardrobes, collectible wins.</span>
                  <ArrowRight className="mt-4 h-4 w-4 shrink-0 text-accent" aria-hidden />
                </motion.button>
                <motion.button
                  type="button"
                  className="flex flex-col items-start rounded-2xl border border-accent/40 bg-accent/10 p-4 text-left shadow-md ring-1 ring-accent/25 transition-colors hover:bg-accent/15"
                  onClick={() => pickTrack("professional")}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  aria-describedby="landing-intro-persona-heading"
                >
                  <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-card text-accent">
                    <BriefcaseBusiness className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="font-semibold text-foreground">Professional desk</span>
                  <span className="mt-2 text-xs text-muted-foreground">Multiple boards, sharper listings, stock lanes.</span>
                  <ArrowRight className="mt-4 h-4 w-4 shrink-0 text-accent" aria-hidden />
                </motion.button>
              </div>
              <button
                type="button"
                className="w-full rounded-full px-4 py-2 text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
                onClick={() => dismissToLanding()}
              >
                Skip for now and explore the homepage
              </button>
              <Link href="/sign-up" className="block pt-2" onClick={dismissToLanding}>
                <Button variant="default" size="lg" className="w-full rounded-full">
                  Sign up free
                </Button>
              </Link>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
