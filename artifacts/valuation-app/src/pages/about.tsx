import { Link } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  Camera,
  BrainCircuit,
  Crown,
  Globe2,
  Megaphone,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const BASE = (import.meta as any).env?.BASE_URL ?? "/";
const LOGO_URL = `${BASE.replace(/\/$/, "")}/logo.png`;

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

const PRICING_TIERS = [
  {
    name: "Free",
    badge: "Default",
    priceLine: "$0",
    cadence: "No subscription required",
    blurb:
      "Run valuations on the essentials track: a market-backed range, regional context, portfolio history, and listing drafts.",
    features: [
      "Baseline and adjusted mid estimate",
      "Regional demand and currency context",
      "Saved reports and portfolio snapshot",
      "AI listing copy drafts for major marketplaces",
    ],
    cta: { href: "/start", label: "Start free", variant: "outline" as const },
  },
  {
    name: "ValYoued Pro",
    badge: "Subscription",
    priceLine: "Paid plan",
    cadence: "Recurring billing via Stripe (checkout shows exact price)",
    blurb:
      "Unlock the full Pro report when you turn Pro on for a new valuation: deeper comparables, live headline context, and a sell-side execution playbook.",
    features: [
      "Verified comparables with sources you can open",
      "World events tied to how they move your price",
      "Pro execution strategy: anchors, walk-aways, listing tactics",
      "Richer markets and stats views while Pro mode is on",
    ],
    cta: { href: "/sign-in", label: "Sign in to subscribe", variant: "default" as const },
  },
] as const;

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

      <section className="relative z-10 px-6 pt-12 pb-12 max-w-4xl mx-auto text-center space-y-5">
        <Badge variant="outline" className="inline-flex items-center gap-1.5 border-accent/40 bg-accent/10 text-accent-foreground px-3 py-1 text-ui-caps tracking-normal">
          <Sparkles className="h-3 w-3 mr-1.5 text-accent" />
          About ValYoued
        </Badge>
        <h1 className="text-4xl md:text-6xl font-sans font-semibold tracking-tight leading-[1.05] text-white">
          How{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-accent to-blue-400">
            ValYoued
          </span>{" "}
          works
        </h1>
        <p className="text-lg text-white/70 max-w-2xl mx-auto leading-relaxed">
          You describe or photograph an asset; we benchmark it against live markets and hand you a
          structured valuation plus help getting it listed.
        </p>
      </section>

      <section className="relative z-10 px-6 pb-20 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="text-ui-caps text-accent/80 mb-2 tracking-normal">Flow</div>
          <h2 className="text-3xl md:text-4xl font-sans font-semibold text-white">
            Four steps from input to listing
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
          <div className="text-ui-caps text-accent/80 mb-2 tracking-normal">Pricing model</div>
          <h2 className="text-3xl md:text-4xl font-sans font-semibold text-white mb-3">
            Free to start, Pro when you need depth
          </h2>
          <p className="text-white/70 max-w-2xl mx-auto leading-relaxed">
            Everyone gets core valuations and listing help. ValYoued Pro is a subscription that pairs with Pro-mode
            reports you generate in the app; manage billing, invoices, and cancellation from Settings after you sign in.
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl border p-6 md:p-8 flex flex-col ${
                tier.name === "ValYoued Pro"
                  ? "border-accent/50 bg-gradient-to-b from-accent/20 to-white/[0.04] ring-1 ring-accent/25"
                  : "border-white/10 bg-white/[0.04]"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {tier.name === "ValYoued Pro" ? (
                      <Crown className="h-5 w-5 text-accent shrink-0" aria-hidden />
                    ) : null}
                    <h3 className="text-xl font-semibold text-white">{tier.name}</h3>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-white/20 bg-white/5 text-white/80 text-[0.65rem] uppercase tracking-wide"
                  >
                    {tier.badge}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-semibold tabular-nums text-white">{tier.priceLine}</div>
                  <div className="text-xs text-white/55 mt-0.5 max-w-[11rem] ml-auto leading-snug">{tier.cadence}</div>
                </div>
              </div>
              <p className="text-sm text-white/70 leading-relaxed mb-6">{tier.blurb}</p>
              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex gap-3 text-sm text-white/80">
                    <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" aria-hidden />
                    <span className="leading-relaxed">{f}</span>
                  </li>
                ))}
              </ul>
              <Link href={tier.cta.href}>
                <Button
                  className={
                    tier.cta.variant === "default"
                      ? "w-full bg-accent hover:bg-accent/90 shadow-[0_0_24px_-6px_hsl(217_91%_60%/0.5)]"
                      : "w-full border-white/25 text-white hover:bg-white/10"
                  }
                  variant={tier.cta.variant === "default" ? "default" : "outline"}
                >
                  {tier.cta.label}
                </Button>
              </Link>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-white/45 max-w-xl mx-auto mt-6 leading-relaxed">
          Taxes, currency, and final renewal terms depend on Stripe Checkout and your payment method. Free tier features
          stay available even if you do not subscribe.
        </p>
      </section>

      <section className="relative z-10 px-6 pb-24 max-w-3xl mx-auto text-center">
        <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/15 to-transparent p-8 md:p-10">
          <Scale className="h-8 w-8 text-accent mx-auto mb-4" />
          <h2 className="text-2xl md:text-3xl font-sans font-semibold text-white mb-3">
            Try it free
          </h2>
          <p className="text-white/70 mb-6 max-w-xl mx-auto">
            First valuation takes about a minute. Sign in after if you want to keep reports in your
            account.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/start">
              <Button size="lg" className="bg-accent hover:bg-accent/90 shadow-[0_0_24px_-6px_hsl(217_91%_60%/0.7)]">
                Start <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="ghost" className="text-white border border-white/20 hover:bg-white/10">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
