import { Link } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Camera,
  BrainCircuit,
  Globe2,
  Megaphone,
  TrendingUp,
  ShieldCheck,
  Clock,
  Scale,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const BASE = (import.meta as any).env?.BASE_URL ?? "/";
const LOGO_URL = `${BASE.replace(/\/$/, "")}/logo.png`;

const STEPS = [
  {
    icon: Camera,
    title: "Snap or describe your asset",
    body:
      "Drop in a photo or fill out a short form: watches, cars, handbags, art, real estate, sneakers, wine, even small businesses. Our vision model auto-fills the brand, model, year and condition for you.",
  },
  {
    icon: BrainCircuit,
    title: "AI prices it against the global market",
    body:
      "We pull live comparables, reference real auction data, scan world events that move the price, and synthesize a baseline range plus an adjusted, condition-aware estimate.",
  },
  {
    icon: Globe2,
    title: "See where it sells for the most",
    body:
      "Every valuation is benchmarked across regions and currencies, so you know whether to list in your home market, ship abroad, or hold for a better window.",
  },
  {
    icon: Megaphone,
    title: "Generate the listing in one click",
    body:
      "We write the headline, description, hashtags, photo angles and pricing strategy for the marketplace where your asset is most likely to sell, then drop you straight onto that platform's create-listing page.",
  },
];

const FEATURES = [
  {
    icon: TrendingUp,
    title: "Valuer-grade reports, not guesses",
    body:
      "Baseline range, adjusted mid, market sentiment overlay, comparable sales, and a final narrative: the same structure a private appraiser would charge hundreds for.",
  },
  {
    icon: Globe2,
    title: "International arbitrage built in",
    body:
      "We surface where the same asset trades for more abroad, including currency, fees, and shipping reality, so you capture the real upside, not just a number on a screen.",
  },
  {
    icon: Clock,
    title: "Pro-tier timing & negotiation tactics",
    body:
      "Optimal sell window, anchor price, walk-away price, and negotiation playbook for buyers who push back. Built for sellers who want to win the conversation, not just price the asset.",
  },
  {
    icon: ShieldCheck,
    title: "Your data, your account",
    body:
      "Every valuation is private to your account. We don't share your photos, prices, or portfolio with anyone. Sign in once and your full history is one click away.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-[100dvh] bg-[hsl(222,47%,6%)] text-white relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[1100px] rounded-full bg-accent/12 blur-[140px]" />
        <div className="absolute -bottom-40 right-0 w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-[120px]" />
      </div>

      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-9 w-9 rounded-lg bg-white/95 flex items-center justify-center shadow ring-1 ring-accent/40">
            <img src={LOGO_URL} alt="ValYoued" className="h-6 w-6 object-contain" />
          </div>
          <div className="text-xl font-brand font-semibold tracking-tight">ValYoued</div>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Home
            </Button>
          </Link>
          <Link href="/sign-in">
            <Button variant="ghost" className="text-white hover:bg-white/10">
              Sign in
            </Button>
          </Link>
          <Link href="/start">
            <Button className="bg-accent hover:bg-accent/90 shadow-[0_0_24px_-6px_hsl(217_91%_60%/0.7)]">
              Get a free valuation <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </nav>

      <section className="relative z-10 px-6 pt-12 pb-16 max-w-4xl mx-auto text-center space-y-6">
        <Badge variant="outline" className="inline-flex items-center gap-1.5 border-accent/40 bg-accent/10 text-accent-foreground px-3 py-1 text-ui-caps tracking-normal">
          <Sparkles className="h-3 w-3 mr-1.5 text-accent" />
          About ValYoued
        </Badge>
        <h1 className="text-4xl md:text-6xl font-sans font-semibold tracking-tight leading-[1.05] text-white">
          Financial valuations,
          <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-accent to-blue-400">
            for everyone.
          </span>
        </h1>
        <p className="text-lg text-white/70 max-w-2xl mx-auto leading-relaxed">
          For too long, knowing what something is really worth, and where to sell it for the most,
          has been a privilege of auction houses, private bankers, and a handful of dealers. ValYoued
          puts that same intelligence in everyone's pocket.
        </p>
      </section>

      <section className="relative z-10 px-6 pb-20 max-w-5xl mx-auto">
        <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/15 via-white/5 to-transparent p-8 md:p-12 backdrop-blur-sm">
          <div className="flex items-start gap-4 mb-4">
            <div className="h-12 w-12 rounded-xl bg-accent/20 ring-1 ring-accent/40 flex items-center justify-center shrink-0">
              <Heart className="h-6 w-6 text-accent" />
            </div>
            <div>
              <div className="text-ui-caps text-accent/80 mb-1 tracking-normal">
                Our mission
              </div>
              <h2 className="text-2xl md:text-3xl font-sans font-semibold text-white">
                Make financial evaluations more accessible.
              </h2>
            </div>
          </div>
          <p className="text-base md:text-lg text-white/75 leading-relaxed">
            We believe everyone, not just professional appraisers and high-net-worth clients,
            deserves a clear, honest answer to "what is this worth, and where should I sell it?"
            ValYoued blends real market data with modern AI to deliver the kind of valuation that used
            to cost hundreds of dollars and take weeks. In seconds. For free.
          </p>
        </div>
      </section>

      <section className="relative z-10 px-6 pb-20 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="text-ui-caps text-accent/80 mb-2 tracking-normal">
            How it works
          </div>
          <h2 className="text-3xl md:text-4xl font-sans font-semibold text-white">
            From asset to ad in four steps
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="rounded-xl border border-white/10 bg-white/[0.04] p-6 hover:border-accent/40 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-accent/15 ring-1 ring-accent/30 flex items-center justify-center shrink-0">
                  <step.icon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <div className="text-ui-caps text-white/40 mb-1 tracking-normal">
                    Step {i + 1}
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-white/70 leading-relaxed">{step.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 px-6 pb-20 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="text-ui-caps text-accent/80 mb-2 tracking-normal">
            Key features
          </div>
          <h2 className="text-3xl md:text-4xl font-sans font-semibold text-white">
            What you get with every valuation
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-white/10 bg-white/[0.04] p-6 hover:border-accent/40 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-accent/15 ring-1 ring-accent/30 flex items-center justify-center shrink-0">
                  <f.icon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-white/70 leading-relaxed">{f.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 px-6 pb-24 max-w-3xl mx-auto text-center">
        <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/15 to-transparent p-8 md:p-10">
          <Scale className="h-8 w-8 text-accent mx-auto mb-4" />
          <h2 className="text-2xl md:text-3xl font-sans font-semibold text-white mb-3">
            Try it for free.
          </h2>
          <p className="text-white/70 mb-6 max-w-xl mx-auto">
            Run your first valuation in under a minute. No credit card. Create a free account at the
            end to unlock your full report.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/start">
              <Button size="lg" className="bg-accent hover:bg-accent/90 shadow-[0_0_24px_-6px_hsl(217_91%_60%/0.7)]">
                Start your first valuation <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="ghost" className="text-white border border-white/20 hover:bg-white/10">
                I have an account
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
