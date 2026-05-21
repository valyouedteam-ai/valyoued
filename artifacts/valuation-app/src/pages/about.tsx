import { Link } from "wouter";
import { Sparkles, Camera, BrainCircuit, Globe2, Megaphone } from "lucide-react";
import { MarketingTopNav } from "@/components/layout/MarketingTopNav";
import { Badge } from "@/components/ui/badge";

const STEPS = [
  {
    icon: Camera,
    title: "Add your asset",
    body: "Upload a photo or describe the item. We infer brand, model, and condition when we can.",
  },
  {
    icon: BrainCircuit,
    title: "Get a market-backed range",
    body: "We compare to live listings and sales, then show a baseline band and a condition-adjusted mid.",
  },
  {
    icon: Globe2,
    title: "Compare regions",
    body: "See how price and demand differ by market and currency before you commit to a venue.",
  },
  {
    icon: Megaphone,
    title: "Move toward a listing",
    body: "We draft listing copy and link you toward creating the ad where that asset type tends to sell.",
  },
];

export default function AboutPage() {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[hsl(40,20%,97%)] text-foreground">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-[20%] top-0 h-[min(70vh,520px)] w-[70%] rounded-full bg-[radial-gradient(ellipse_at_center,hsl(175_45%_45%/0.12),transparent_70%)] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[min(60vh,480px)] w-[55%] rounded-full bg-[radial-gradient(ellipse_at_center,hsl(258_45%_55%/0.08),transparent_70%)] blur-3xl" />
      </div>

      <MarketingTopNav variant="light" />

      <section className="relative z-10 mx-auto max-w-4xl space-y-5 px-6 pb-12 pt-12 text-center">
        <Badge
          variant="secondary"
          className="inline-flex items-center gap-1.5 rounded-full border border-border/80 px-3 py-1 text-ui-caps tracking-normal"
        >
          <Sparkles className="h-3 w-3 text-accent" aria-hidden />
          About ValYoued
        </Badge>
        <h1 className="font-sans text-4xl font-semibold leading-[1.05] tracking-tight text-foreground md:text-6xl">
          How <span className="brand-gradient">ValYoued</span> works
        </h1>
        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground">
          You describe or photograph an asset; we benchmark it against live markets and hand you a structured valuation
          plus help getting it listed.
        </p>
      </section>

      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-24 md:pb-28">
        <div className="mb-10 text-center">
          <div className="text-ui-caps mb-2 tracking-normal text-accent">Flow</div>
          <h2 className="font-sans text-3xl font-semibold text-foreground md:text-4xl">Four steps from input to listing</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="rounded-2xl border border-border/70 bg-card/90 p-6 shadow-sm transition-shadow hover:border-accent/40 hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 ring-1 ring-accent/20">
                  <step.icon className="h-5 w-5 text-accent" aria-hidden />
                </div>
                <div className="min-w-0 text-left">
                  <div className="text-ui-caps mb-1 tracking-normal text-muted-foreground">Step {i + 1}</div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 border-t border-border/70 px-6 py-10 text-sm text-muted-foreground sm:flex-row">
        <span>© {new Date().getFullYear()} ValYoued</span>
        <div className="flex gap-8">
          <Link href="/pricing" className="transition-colors hover:text-foreground">
            Pricing
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            Privacy
          </Link>
        </div>
      </footer>
    </div>
  );
}
