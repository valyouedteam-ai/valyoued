import { lazy, Suspense } from "react";
import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Globe2, ShieldCheck, Zap } from "lucide-react";
import { MarketingTopNav } from "@/components/layout/MarketingTopNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const Globe = lazy(() => import("@/components/Globe").then((m) => ({ default: m.Globe })));

const container = {
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
  hidden: { opacity: 0 },
};

const item = {
  visible: { opacity: 1, y: 0 },
  hidden: { opacity: 0, y: 10 },
};

export default function LandingPage() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="min-h-[100dvh] bg-[hsl(40,20%,97%)] text-foreground">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-[20%] top-0 h-[min(70vh,520px)] w-[70%] rounded-full bg-[radial-gradient(ellipse_at_center,hsl(175_45%_45%/0.12),transparent_70%)] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[min(60vh,480px)] w-[55%] rounded-full bg-[radial-gradient(ellipse_at_center,hsl(258_45%_55%/0.08),transparent_70%)] blur-3xl" />
      </div>

      <MarketingTopNav variant="light" />

      <section className="relative z-10 mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:pt-8">
        <motion.div
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "visible"}
          viewport={{ once: true, margin: "-10%" }}
          variants={reduceMotion ? undefined : container}
          className="space-y-8"
        >
          <motion.div variants={reduceMotion ? undefined : item}>
            <Badge variant="secondary" className="rounded-full border border-border/80 px-3 py-1 text-ui-caps">
              Multi-asset valuations
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
            Structured valuations you can revisit, regional demand shifts, and listing drafts tuned by plan tier:
            Everyday, Everyday+, and Professional.{" "}
            <Link href="/pricing" className="font-medium text-accent underline-offset-4 hover:underline">
              Compare plans and pricing.
            </Link>
          </motion.p>
          <motion.div variants={reduceMotion ? undefined : item} className="flex flex-wrap gap-3">
            <Link href="/welcome">
              <Button size="lg" className="h-12 rounded-full px-7 shadow-lg" data-testid="hero-create-account">
                Create account: pick Everyday or Pro
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/start">
              <Button size="lg" variant="outline" className="h-12 rounded-full border-border/80 px-7 shadow-md" data-testid="hero-start-cta">
                Start free valuation
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
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: reduceMotion ? 0 : 0.45 }}
          className="relative"
        >
          <div className="overflow-hidden rounded-[1.75rem] border border-border/80 bg-[hsl(222,28%,10%)] shadow-2xl ring-1 ring-black/5">
            <Suspense
              fallback={
                <div className="flex h-[400px] items-center justify-center lg:h-[480px]">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-accent" />
                </div>
              }
            >
              <Globe height={480} />
            </Suspense>
          </div>
        </motion.div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              icon: Globe2,
              title: "Compare markets",
              body: "See how buyers and typical costs differ across regions. Everyday+ unlocks fuller views of those options.",
            },
            {
              icon: Zap,
              title: "Your photo fills the blanks",
              body: "Upload a snapshot and we fill matching fields when the picture makes them clear. You finish the judgment calls.",
            },
            {
              icon: ShieldCheck,
              title: "Listing drafts you can polish",
              body: "Get draft posts shaped for popular marketplaces, with sharper seller wording available on Professional plans.",
            },
          ].map((f) => (
            <motion.div
              key={f.title}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: reduceMotion ? 0 : 0.35 }}
              className="rounded-2xl border border-border/70 bg-card/90 p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 font-semibold tracking-tight">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 border-t border-border/70 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <span>© {new Date().getFullYear()} ValYoued</span>
        <div className="flex gap-8">
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            Privacy
          </Link>
          <Link href="/about" className="transition-colors hover:text-foreground">
            How it works
          </Link>
          <Link href="/pricing" className="transition-colors hover:text-foreground">
            Pricing
          </Link>
        </div>
      </footer>
    </div>
  );
}
