import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { LandingIntroOverlay } from "@/components/marketing/LandingIntroOverlay";
import { LandingScrollNav } from "@/components/marketing/landing/LandingScrollNav";
import {
  LandingCollaboration,
  LandingFinalCta,
  LandingFooter,
  LandingHero,
  LandingMission,
  LandingQuote,
  LandingTemplates,
  LandingUseCases,
} from "@/components/marketing/landing/LandingSections";

const SCROLL_DEPTH_TO_UNLOCK = 0.55;

export default function LandingPage() {
  const reduceMotion = useReducedMotion();
  const landingIntroSentinelRef = useRef<HTMLDivElement | null>(null);
  const [landingIntroUnlocked, setLandingIntroUnlocked] = useState(false);

  const unlockIntro = useCallback(() => {
    setLandingIntroUnlocked(true);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      setLandingIntroUnlocked(true);
      return;
    }

    function scrollDepth(): number {
      const doc = document.documentElement;
      const maxScroll = doc.scrollHeight - window.innerHeight;
      if (maxScroll <= 0) return 1;
      return window.scrollY / maxScroll;
    }

    function maybeUnlock(fromSentinel: boolean) {
      if (fromSentinel && scrollDepth() >= SCROLL_DEPTH_TO_UNLOCK) {
        setLandingIntroUnlocked(true);
      }
    }

    const el = landingIntroSentinelRef.current;
    let obs: IntersectionObserver | null = null;
    if (el) {
      obs = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) maybeUnlock(true);
        },
        { root: null, rootMargin: "0px", threshold: 0.1 },
      );
      obs.observe(el);
    }

    const onScroll = () => {
      if (scrollDepth() >= SCROLL_DEPTH_TO_UNLOCK) setLandingIntroUnlocked(true);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      obs?.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [reduceMotion]);

  return (
    <div className="min-h-[100dvh] bg-[#fafafa] text-foreground">
      <LandingScrollNav />

      <main>
        <LandingHero />
        <LandingMission onVisible={unlockIntro} />
        <LandingQuote />
        <LandingCollaboration />
        <LandingUseCases />
        <LandingTemplates />
        <LandingFinalCta />
        <div ref={landingIntroSentinelRef} className="h-px w-full shrink-0" aria-hidden />
      </main>

      <LandingFooter />
      <LandingIntroOverlay unlocked={landingIntroUnlocked} />
    </div>
  );
}
