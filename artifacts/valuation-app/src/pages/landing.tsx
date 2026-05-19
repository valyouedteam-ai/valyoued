import { lazy, Suspense } from "react";
import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Globe2, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Globe = lazy(() => import("@/components/Globe").then((m) => ({ default: m.Globe })));

const BASE = (import.meta as any).env?.BASE_URL ?? "/";
const LOGO_URL = `${BASE.replace(/\/$/, "")}/logo.png`;

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

function PricingSticky() {
  return (
    <section className="relative z-10 mx-auto max-w-6xl px-4 pb-10 sm:px-6 lg:sticky lg:top-[4.5rem]">
      <div className="rounded-3xl border border-border/60 bg-[hsl(40,25%,96%)]/92 p-4 shadow-xl shadow-black/10 backdrop-blur-md dark:bg-card/92">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-ui-caps text-accent">Straightforward tiers</p>
            <h2 className="mt-1 text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Everyday free caps at five valuations/month — upgrade removes the leash
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Trials and exact pricing come from Stripe; copy below mirrors the roadmap you wired on the backend.
            </p>
          </div>
          <Badge variant="secondary" className="w-fit shrink-0 border border-border/70">
            Paid tiers via Stripe
          </Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Everyday · Free",
              price: "£0",
              bullets: ["5 valuations / calendar month cap", "Core dashboards + history", "Email when each report completes"],
              ctaLabel: "Start free valuation",
              ctaHref: "/start",
              variant: "outline" as const,
            },
            {
              title: "Everyday+",
              price: "£7.99/mo",
              bullets: ["Unlimited valuations policy", "Full arbitrage rows", "Configurable monitor alerts"],
              ctaLabel: "Plan details",
              ctaHref: "/welcome",
              variant: "default" as const,
            },
            {
              title: "Professional",
              price: "£14.99/mo",
              bullets: ["Seller-grade listing tone presets", "Pro desk workspaces", "Stripe trial configurable via env"],
              ctaLabel: "Create professional account",
              ctaHref: "/welcome",
              variant: "secondary" as const,
            },
          ].map((p) => (
            <Card
              key={p.title}
              className={`border-border/70 bg-card/98 shadow-sm backdrop-blur ${p.title.startsWith("Professional") ? "md:ring-1 md:ring-accent/35" : ""}`}
            >
              <CardHeader className="space-y-1 pb-3">
                <CardTitle className="text-lg font-semibold">{p.title}</CardTitle>
                <CardDescription className="text-xl font-semibold tabular-nums text-foreground">{p.price}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {p.bullets.map((b) => (
                    <li key={b} className="flex gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <Button variant={p.variant} className="w-full rounded-xl" size="lg" asChild>
                  <Link href={p.ctaHref}>{p.ctaLabel}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="min-h-[100dvh] bg-[hsl(40,20%,97%)] text-foreground">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-[20%] top-0 h-[min(70vh,520px)] w-[70%] rounded-full bg-[radial-gradient(ellipse_at_center,hsl(175_45%_45%/0.12),transparent_70%)] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[min(60vh,480px)] w-[55%] rounded-full bg-[radial-gradient(ellipse_at_center,hsl(258_45%_55%/0.08),transparent_70%)] blur-3xl" />
      </div>

      <motion.nav
        initial={reduceMotion ? false : "hidden"}
        animate={reduceMotion ? false : "visible"}
        variants={reduceMotion ? undefined : item}
        className="relative z-10 mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6"
      >
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-md ring-1 ring-border/80">
            <img src={LOGO_URL} alt="ValYoued" className="h-7 w-7 object-contain" />
          </div>
          <span className="font-brand text-2xl text-foreground">ValYoued</span>
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
          <Link href="/about">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground" data-testid="nav-about">
              How it works
            </Button>
          </Link>
          <Link href="/welcome">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              Pricing
            </Button>
          </Link>
          <Link href="/sign-in">
            <Button variant="ghost" className="hidden sm:inline-flex" data-testid="nav-sign-in">
              Sign in
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button variant="outline" className="border-border/80 px-4 shadow-sm" data-testid="nav-sign-up">
              Sign up
            </Button>
          </Link>
          <Link href="/welcome">
            <Button className="rounded-full shadow-sm gap-2" data-testid="nav-create-account">
              Create account
              <Sparkles className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/start">
            <Button variant="secondary" className="rounded-full border border-border/60 shadow-sm gap-2" data-testid="nav-get-started">
              Start free valuation
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </motion.nav>

      <PricingSticky />

      <section className="relative z-10 mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-2 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:pt-2">
        <motion.div
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "visible"}
          viewport={{ once: true, margin: "-10%" }}
          variants={reduceMotion ? undefined : container}
          className="space-y-8"
        >
          <motion.div variants={reduceMotion ? undefined : item}>
            <Badge variant="secondary" className="rounded-full border border-border/80 px-3 py-1 text-ui-caps">
              Multi-asset · AI-assisted
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
            Structured valuations you can revisit, regional demand shifts, and listing drafts tuned by plan tier —
            Everyday, Everyday+, and Professional.
          </motion.p>
          <motion.div variants={reduceMotion ? undefined : item} className="flex flex-wrap gap-3">
            <Link href="/welcome">
              <Button size="lg" className="h-12 rounded-full px-7 shadow-lg" data-testid="hero-create-account">
                Create account — pick Everyday or Pro
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
              <div className="text-2xl font-semibold tabular-nums text-foreground">Stripe</div>
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
              title: "Global price discovery",
              body: "Regional demand, fees, and friction so you see where net proceeds may land (paid Everyday+ onward).",
            },
            {
              icon: Zap,
              title: "Photo to structured data",
              body: "Upload once; vision fills matching fields so you spend time on judgment, not typing.",
            },
            {
              icon: ShieldCheck,
              title: "Listing-ready copy",
              body: "Platform-aware drafts tighten up with Professional tiers and reseller tone knobs.",
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
          <Link href="/welcome" className="transition-colors hover:text-foreground">
            Plans
          </Link>
        </div>
      </footer>
    </div>
  );
}
