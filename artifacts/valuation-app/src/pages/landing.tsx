import { lazy, Suspense } from "react";
import { Link } from "wouter";
import { ArrowRight, Globe2, MapPin, Route, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const Globe = lazy(() => import("@/components/Globe").then((m) => ({ default: m.Globe })));

const BASE = (import.meta as any).env?.BASE_URL ?? "/";
const LOGO_URL = `${BASE.replace(/\/$/, "")}/logo.png`;

function GlobeCaption() {
  const hints = [
    {
      icon: MapPin,
      title: "City pins",
      body: "Light dots mark example sell-side markets across regions.",
    },
    {
      icon: Route,
      title: "Arcs between cities",
      body: "Curved lines are a visual metaphor for cross-border interest—not live trades or order flow.",
    },
    {
      icon: Sparkles,
      title: "Your valuation",
      body: "In the product, the same idea powers real comparables, fees, and where net proceeds may land for your item.",
    },
  ];

  return (
    <div className="w-full space-y-4">
      <div className="space-y-1.5">
        <p className="text-ui-caps tracking-normal text-sky-200/90">How to read this</p>
        <h3 className="text-lg font-semibold leading-snug text-white">
          The globe is a preview, not a data feed
        </h3>
        <p className="text-sm leading-relaxed text-white/65">
          It spins through stylized geography so you can see the question ValYoued keeps asking: where could this
          asset resonate, and what might that mean before you list?
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {hints.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-3 backdrop-blur-sm"
          >
            <div className="mb-2 flex items-center gap-2 text-sky-200/95">
              <Icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2.25} aria-hidden />
              <span className="text-sm font-semibold text-white">{title}</span>
            </div>
            <p className="text-[13px] leading-snug text-white/60">{body}</p>
          </div>
        ))}
      </div>

      <p className="text-[11px] leading-snug text-white/45">
        Illustration only · For real ranges and listing help, run a valuation with your photos and details.
      </p>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] bg-[hsl(40,20%,97%)] text-foreground">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-[20%] top-0 h-[min(70vh,520px)] w-[70%] rounded-full bg-[radial-gradient(ellipse_at_center,hsl(175_45%_45%/0.12),transparent_70%)] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[min(60vh,480px)] w-[55%] rounded-full bg-[radial-gradient(ellipse_at_center,hsl(258_45%_55%/0.08),transparent_70%)] blur-3xl" />
      </div>

      <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-md ring-1 ring-border/80">
            <img src={LOGO_URL} alt="ValYoued" className="h-7 w-7 object-contain" />
          </div>
          <span className="font-brand text-2xl text-foreground">ValYoued</span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <Link href="/about">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground" data-testid="nav-about">
              How it works
            </Button>
          </Link>
          <Link href="/sign-in">
            <Button variant="ghost" className="hidden sm:inline-flex" data-testid="nav-sign-in">
              Sign in
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button variant="outline" className="hidden sm:inline-flex border-border/80 shadow-sm" data-testid="nav-sign-up">
              Sign up
            </Button>
          </Link>
          <Link href="/start">
            <Button className="rounded-full shadow-sm" data-testid="nav-get-started">
              Free valuation <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </nav>

      <section className="relative z-10 mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:pt-8">
        <div className="space-y-8">
          <Badge variant="secondary" className="rounded-full border border-border/80 px-3 py-1 text-ui-caps">
            Multi-asset · AI-assisted
          </Badge>
          <h1 className="text-4xl font-semibold leading-[1.12] tracking-tight text-foreground sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]">
            Track what you own in one place,{" "}
            <span className="brand-gradient">sell when the window is right.</span>
          </h1>
          <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
            Structured valuations you can revisit, regional demand shifts, and listing copy tuned for marketplaces—so
            you&apos;re not guessing when to move.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/start">
              <Button size="lg" className="h-12 rounded-full px-7 shadow-md" data-testid="hero-start-cta">
                Start your valuation
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="outline" className="h-12 rounded-full border-border/80 px-7 shadow-sm">
                I have an account
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap gap-6 border-t border-border/60 pt-8 text-sm text-muted-foreground">
            <div>
              <div className="text-2xl font-semibold tabular-nums text-foreground">40+</div>
              asset classes
            </div>
            <div>
              <div className="text-2xl font-semibold tabular-nums text-foreground">Pro</div>
              arbitrage + tactics
            </div>
            <div>
              <div className="text-2xl font-semibold tabular-nums text-foreground">1-click</div>
              listing drafts
            </div>
          </div>
        </div>

        <div className="relative">
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
            <div className="border-t border-white/10 bg-gradient-to-t from-black/40 to-transparent p-5">
              <GlobeCaption />
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              icon: Globe2,
              title: "Global price discovery",
              body: "Regional demand, fees, and friction so you see where net proceeds may land.",
            },
            {
              icon: Zap,
              title: "Photo to structured data",
              body: "Upload once; vision fills matching fields so you spend time on judgment, not typing.",
            },
            {
              icon: ShieldCheck,
              title: "Listing-ready copy",
              body: "Pick a platform and get title, body, hashtags, and tips aligned to buyer norms.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border/70 bg-card/90 p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 font-semibold tracking-tight">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 border-t border-border/70 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <span>© {new Date().getFullYear()} ValYoued</span>
        <div className="flex gap-8">
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy
          </Link>
          <Link href="/about" className="hover:text-foreground transition-colors">
            How it works
          </Link>
        </div>
      </footer>
    </div>
  );
}
