import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "wouter";
import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import {
  ArrowRight,
  Briefcase,
  ChevronRight,
  Megaphone,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PhoneFrame } from "@/components/marketing/PhoneFrame";
import { PRODUCT_WALKTHROUGH_STEPS, WALKTHROUGH_SCREEN_HEIGHT_PX } from "@/components/marketing/walkthrough-steps";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { UseCaseFeaturePreview } from "@/components/marketing/landing/UseCaseFeaturePreviews";

function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-8% 0px" });
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y }}
      animate={reduceMotion || inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

const LOGO_STRIP = ["Collectors", "Resellers", "Estates", "Desks", "Markets", "Insurance"];

const COLLAB_CARDS = [
  {
    title: "Shared portfolio view",
    body: "Everyone sees the same shelf mix, health strip, and valuation history.",
    gradient: "bg-gradient-to-br from-teal-400/30 via-teal-500/10 to-white",
    icon: Users,
  },
  {
    title: "Workspace lanes",
    body: "Split primary holdings, inheritance, and trading desks without mingled totals.",
    gradient: "bg-gradient-to-br from-emerald-400/25 via-cyan-500/10 to-white",
    icon: Briefcase,
  },
  {
    title: "Listing handoff",
    body: "Draft humane ads and jump toward the venues that fit the asset class.",
    gradient: "bg-gradient-to-br from-cyan-400/25 via-teal-500/10 to-white",
    icon: Megaphone,
  },
] as const;

const USE_CASE_TABS = [
  {
    id: "resell",
    label: "Resellers",
    headline: "Desks built for volume",
    body: "Market watch, inventory pipeline, and exportable reports for active traders.",
  },
  {
    id: "collect",
    label: "Collectors",
    headline: "One ledger for what you keep",
    body: "Track luxury, everyday, and collectible shelves with confidence and receipt status.",
  },
  {
    id: "inherit",
    label: "Inheritance",
    headline: "A separate ledger for heirs",
    body: "Violet-scoped workspace for estates and heirlooms that stay off your primary holdings.",
  },
  {
    id: "pro",
    label: "Professionals",
    headline: "Price stock before you buy",
    body: "Deal scores, margin hints, and repricing alerts for inventory that turns quickly.",
  },
] as const;

const TEMPLATE_CARDS = [
  { title: "Luxury bags", tone: "bg-teal-600" },
  { title: "Watches", tone: "bg-emerald-600" },
  { title: "Electronics", tone: "bg-cyan-600" },
  { title: "Cars", tone: "bg-teal-700" },
  { title: "Jewellery", tone: "bg-emerald-700" },
  { title: "Collectibles", tone: "bg-cyan-700" },
] as const;

function DemoPhone({ stepIndex }: { stepIndex: number }) {
  const step = PRODUCT_WALKTHROUGH_STEPS[stepIndex] ?? PRODUCT_WALKTHROUGH_STEPS[0];
  return (
    <PhoneFrame>
      <div className="overflow-hidden" style={{ height: `${WALKTHROUGH_SCREEN_HEIGHT_PX}px` }}>
        {step.screen}
      </div>
    </PhoneFrame>
  );
}

export function LandingHero() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-8 pt-16 text-center sm:px-6 sm:pt-20 lg:pb-16 lg:pt-24">
      <Reveal className="mx-auto max-w-4xl">
        <h1 className="text-balance text-[2.75rem] font-bold leading-[1.02] tracking-[-0.03em] text-foreground sm:text-6xl lg:text-[4.5rem]">
          One ledger for everything you own and sell.
        </h1>
      </Reveal>

      <Reveal delay={0.08} className="mt-10">
        <Link href="/sign-up">
          <Button
            size="lg"
            className="h-14 rounded-full bg-accent px-10 text-base font-semibold text-white shadow-lg shadow-accent/25 hover:bg-accent/90"
            data-testid="landing-cta-signup"
          >
            Try for free
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </Reveal>

      <Reveal delay={0.14} className="mt-16 lg:mt-24">
        <p className="mb-6 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Built for stewards and desks
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-60">
          {LOGO_STRIP.map((name) => (
            <span key={name} className="text-sm font-bold tracking-tight text-foreground/80 sm:text-base">
              {name}
            </span>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

export function LandingDemoReveal({ onVisible }: { onVisible?: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const [step, setStep] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (inView) onVisible?.();
  }, [inView, onVisible]);

  return (
    <section ref={ref} className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-28">
      <Reveal className="relative">
        <div className="relative overflow-hidden rounded-[2rem] border border-black/5 bg-white p-6 shadow-2xl shadow-black/10 sm:rounded-[2.5rem] sm:p-10 lg:p-14">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(175_55%_45%/0.08),transparent_55%)]" />

          <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-md space-y-4 text-left">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent">How it works</p>
              <h2 className="text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl">
                From photo to portfolio clarity
              </h2>
              <p className="text-base leading-relaxed text-muted-foreground">
                Four steps from capture through valuation, regional compare, and listing drafts.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                {PRODUCT_WALKTHROUGH_STEPS.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStep(i)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                      i === step ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80",
                    )}
                  >
                    {i + 1}. {s.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative shrink-0">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={step}
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98, y: -8 }}
                  transition={{ duration: 0.45 }}
                >
                  <DemoPhone stepIndex={step} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function MissionWord({
  word,
  index,
  total,
  scrollYProgress,
  muted,
}: {
  word: string;
  index: number;
  total: number;
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
  muted?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const opacity = useTransform(
    scrollYProgress,
    [index / total, (index + 1.2) / total],
    [0.25, 1],
  );

  return (
    <motion.span
      style={reduceMotion ? undefined : { opacity }}
      className={cn("mr-[0.28em] inline-block", muted && "text-muted-foreground")}
    >
      {word}
    </motion.span>
  );
}

export function LandingMission() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.9", "end 0.35"] });
  const words: { text: string; muted?: boolean }[] = [
    { text: "ValYoued" },
    { text: "turns", muted: true },
    { text: "scattered", muted: true },
    { text: "market", muted: true },
    { text: "noise", muted: true },
    { text: "into" },
    { text: "one" },
    { text: "calm" },
    { text: "ledger" },
    { text: "you" },
    { text: "can" },
    { text: "act" },
    { text: "on." },
  ];

  return (
    <section ref={ref} className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-32">
      <p className="mb-8 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">Mission</p>
      <h2 className="max-w-5xl text-left text-4xl font-bold leading-[1.08] tracking-[-0.03em] text-foreground sm:text-5xl lg:text-6xl">
        {words.map((w, i) => (
          <MissionWord
            key={`${w.text}-${i}`}
            word={w.text}
            index={i}
            total={words.length}
            scrollYProgress={scrollYProgress}
            muted={w.muted}
          />
        ))}
      </h2>
    </section>
  );
}

export function LandingQuote() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 lg:py-32">
      <Reveal>
        <blockquote className="text-3xl font-bold leading-snug tracking-[-0.02em] text-foreground sm:text-4xl lg:text-5xl">
          “We stopped guessing resale windows. ValYoued gave us one number, one shelf, and listings that sound human.”
        </blockquote>
        <p className="mt-8 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Independent reseller, London
        </p>
      </Reveal>
    </section>
  );
}

export function LandingCollaboration() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
      <div>
        <Carousel opts={{ align: "start", loop: true }} className="w-full">
          <CarouselContent className="-ml-4">
            {COLLAB_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <CarouselItem key={card.title} className="basis-[85%] pl-4 sm:basis-[70%] lg:basis-[55%]">
                  <article
                    className={cn(
                      "flex h-[320px] flex-col justify-between overflow-hidden rounded-[2rem] border border-black/5 p-8 shadow-xl",
                      card.gradient,
                    )}
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/90 shadow-sm">
                      <Icon className="h-7 w-7 text-accent" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold tracking-tight">{card.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-foreground/75">{card.body}</p>
                    </div>
                  </article>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <div className="mt-6 flex justify-end gap-2">
            <CarouselPrevious className="static translate-y-0 rounded-full border-black/10" />
            <CarouselNext className="static translate-y-0 rounded-full border-black/10" />
          </div>
        </Carousel>
      </div>
    </section>
  );
}

export function LandingUseCases() {
  const [active, setActive] = useState<(typeof USE_CASE_TABS)[number]["id"]>(USE_CASE_TABS[0].id);
  const tab = USE_CASE_TABS.find((t) => t.id === active) ?? USE_CASE_TABS[0];

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
      <div className="overflow-hidden rounded-[2.5rem] bg-[#f3f4f6] px-6 py-12 sm:px-10 sm:py-16 lg:px-14">
        <Reveal>
          <h2 className="max-w-3xl text-4xl font-bold tracking-[-0.02em] text-foreground sm:text-5xl">
            Use cases for resellers, collectors, estates, and desks
          </h2>
        </Reveal>

        <div className="mt-10 flex flex-wrap gap-2">
          {USE_CASE_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                active === t.id ? "bg-foreground text-background" : "bg-white text-foreground/70 hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="mt-10 grid gap-8 lg:grid-cols-2 lg:items-center"
          >
            <div>
              <h3 className="text-3xl font-bold tracking-tight">{tab.headline}</h3>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{tab.body}</p>
              <Link href="/welcome" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline">
                Pick your track
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <UseCaseFeaturePreview variant={tab.id} />
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

export function LandingTemplates() {
  return (
    <section className="relative mx-auto max-w-6xl overflow-hidden px-4 py-16 sm:px-6 lg:py-24">
      <Reveal className="text-center">
        <h2 className="text-4xl font-bold tracking-[-0.02em] text-foreground sm:text-5xl lg:text-6xl">
          Start from a template
        </h2>
        <p className="mt-4 text-lg text-muted-foreground md:whitespace-nowrap">
          Asset-class starters with the fields and comps language already wired in.
        </p>
      </Reveal>

      <div className="relative mt-12">
        <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TEMPLATE_CARDS.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-5%" }}
              transition={{ delay: i * 0.06, duration: 0.5 }}
              className="w-[min(78vw,280px)] shrink-0 snap-start"
            >
              <div className="overflow-hidden rounded-[1.75rem] border border-black/5 bg-white shadow-lg">
                <div className={cn("flex h-44 items-end p-6 text-white", card.tone)}>
                  <span className="text-xl font-bold">{card.title}</span>
                </div>
                <div className="space-y-2 p-5">
                  <div className="h-2 w-2/3 rounded-full bg-muted" />
                  <div className="h-2 w-1/2 rounded-full bg-muted" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center">
          <Link href="/start" className="pointer-events-auto">
            <Button className="h-14 rounded-full bg-foreground px-8 text-base font-semibold text-background shadow-2xl hover:bg-foreground/90">
              Browse templates
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

export function LandingFinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-xl">
        <Link href="/pricing#plans" className="group block">
          <article className="flex min-h-[220px] flex-col justify-between rounded-[2rem] bg-[hsl(175,35%,92%)] p-8 transition-transform group-hover:-translate-y-1">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent">Pricing</p>
              <h3 className="mt-3 text-3xl font-bold tracking-tight">Start free, upgrade when you grow</h3>
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-semibold">
              See plans
              <ArrowRight className="h-4 w-4" />
            </span>
          </article>
        </Link>
      </div>

      <Reveal className="mt-16 text-center">
        <Link href="/sign-up">
          <Button
            size="lg"
            className="h-14 rounded-full bg-accent px-10 text-base font-semibold text-white shadow-lg hover:bg-accent/90"
          >
            Get started for free
          </Button>
        </Link>
      </Reveal>
    </section>
  );
}

export function LandingFooter() {
  const columns = [
    {
      title: "Product",
      links: [
        { href: "/pricing#plans", label: "Pricing" },
        { href: "/welcome", label: "Everyday vs Professional" },
        { href: "/start", label: "Guest valuation" },
      ],
    },
    {
      title: "Start",
      links: [
        { href: "/sign-up", label: "Sign up" },
        { href: "/start", label: "Guest valuation" },
        { href: "/sign-in", label: "Log in" },
      ],
    },
    {
      title: "Legal",
      links: [{ href: "/privacy", label: "Privacy" }],
    },
  ] as const;

  return (
    <footer className="border-t border-black/5 bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.2fr_repeat(3,1fr)]">
        <div>
          <p className="font-brand text-2xl font-bold tracking-tight">ValYoued</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Structured valuations, regional context, and listing drafts on one ledger.
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <p className="text-sm font-semibold text-foreground">{col.title}</p>
            <ul className="mt-4 space-y-2">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-black/5 py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} ValYoued
      </div>
    </footer>
  );
}
