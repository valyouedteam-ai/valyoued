import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { LandingIntroOverlay } from "@/components/marketing/LandingIntroOverlay";
import { ProductWalkthrough } from "@/components/marketing/ProductWalkthrough";
import { MarketingTopNav } from "@/components/layout/MarketingTopNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const Globe = lazy(() => import("@/components/Globe").then((m) => ({ default: m.Globe })));

const container = {
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.12 },
  },
  hidden: { opacity: 0 },
};

const item = {
  visible: { opacity: 1, y: 0 },
  hidden: { opacity: 0, y: 12 },
};

const SCROLL_DEPTH_TO_UNLOCK = 0.58;

export default function LandingPage() {
  const reduceMotion = useReducedMotion();
  const landingIntroSentinelRef = useRef<HTMLDivElement | null>(null);
  const [landingIntroUnlocked, setLandingIntroUnlocked] = useState(false);

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
        { root: null, rootMargin: "0px 0px 0px 0px", threshold: 0.1 },
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
    <div className="min-h-[100dvh] bg-[hsl(40,20%,97%)] text-foreground">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-[20%] top-0 h-[min(70vh,520px)] w-[70%] rounded-full bg-[radial-gradient(ellipse_at_center,hsl(175_45%_45%/0.12),transparent_70%)] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[min(60vh,480px)] w-[55%] rounded-full bg-[radial-gradient(ellipse_at_center,hsl(258_45%_55%/0.08),transparent_70%)] blur-3xl" />
      </div>

      <MarketingTopNav variant="light" />

      <section className="relative z-10 mx-auto grid max-w-6xl gap-12 px-4 pb-10 pt-3 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:pb-14 lg:pt-2">
        <motion.div
          initial={reduceMotion ? false : "hidden"}
          animate={reduceMotion ? undefined : "visible"}
          variants={reduceMotion ? undefined : container}
          className="space-y-8"
        >
          <motion.div variants={reduceMotion ? undefined : item}>
            <Badge variant="secondary" className="rounded-full border border-border/80 px-3 py-1 text-ui-caps">
              Multi-asset valuations in motion
            </Badge>
          </motion.div>
          <motion.h1
            variants={reduceMotion ? undefined : item}
            className="text-balance text-4xl font-semibold leading-[1.12] tracking-tight text-foreground sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]"
          >
            Track what you own in one place,{" "}
            <span className="brand-gradient">sell when the window is right.</span>
          </motion.h1>
          <motion.p variants={reduceMotion ? undefined : item} className="max-w-lg text-lg leading-relaxed text-muted-foreground">
            Structured valuations and listing drafts on one ledger.{" "}
            <Link href="/pricing#plans" className="font-medium text-accent underline-offset-4 hover:underline">
              Pricing
            </Link>
            .
          </motion.p>
          <motion.div
            variants={reduceMotion ? undefined : item}
            className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-8"
          >
            <Link href="/sign-up">
              <Button size="lg" className="rounded-full px-8 py-6 text-base shadow-lg" data-testid="landing-cta-signup">
                Sign up free
                <ArrowRight className="ml-2 h-5 w-5" aria-hidden />
              </Button>
            </Link>
            <Link href="/start">
              <Button size="lg" variant="outline" className="rounded-full border-border/70 px-6 py-6 text-base shadow-sm gap-2">
                Start valuation as a guest
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </Link>
            <Link href="/welcome">
              <Button size="lg" variant="ghost" className="rounded-full text-muted-foreground">
                Everyday vs Professional track
              </Button>
            </Link>
          </motion.div>
          <motion.div
            variants={reduceMotion ? undefined : item}
            className="flex flex-wrap gap-6 border-t border-border/60 pt-8 text-sm text-muted-foreground"
          >
            <div>
              <div className="text-2xl font-semibold tabular-nums text-foreground motion-safe:animate-pulse">40+</div>
              asset classes
            </div>
            <div>
              <div className="text-2xl font-semibold tabular-nums text-foreground">Secure</div>
              subscription billing
            </div>
            <div>
              <div className="text-2xl font-semibold tabular-nums text-foreground">1-click</div>
              listing drafts
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.55, delay: reduceMotion ? 0 : 0.15 }}
          className="relative"
        >
          <motion.div
            animate={
              reduceMotion
                ? undefined
                : {
                    y: [0, -6, 0],
                  }
            }
            transition={
              reduceMotion
                ? undefined
                : {
                    duration: 12,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }
            }
            className="overflow-hidden rounded-[1.75rem] border border-border/80 bg-[hsl(222,28%,10%)] shadow-2xl ring-1 ring-black/5"
          >
            <Suspense
              fallback={
                <div className="flex h-[400px] items-center justify-center lg:h-[480px]">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-accent" />
                </div>
              }
            >
              <Globe height={480} />
            </Suspense>
          </motion.div>
        </motion.div>
      </section>

      <ProductWalkthrough />

      <div ref={landingIntroSentinelRef} className="h-px w-full max-w-6xl mx-auto shrink-0" aria-hidden />

      <footer className="relative z-10 mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 border-t border-border/70 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <span>© {new Date().getFullYear()} ValYoued</span>
        <div className="flex gap-8">
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            Privacy
          </Link>
          <Link href="/about" className="transition-colors hover:text-foreground">
            How it works
          </Link>
          <Link href="/pricing#plans" className="transition-colors hover:text-foreground">
            Pricing details
          </Link>
        </div>
      </footer>

      <LandingIntroOverlay unlocked={landingIntroUnlocked} />
    </div>
  );
}
