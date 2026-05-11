import { useEffect, useState, lazy, Suspense } from "react";
import { Link } from "wouter";
import { ArrowRight, Globe2, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DEALS } from "@/components/Globe";

// Globe is heavy (three.js); lazy-load so the hero text paints first.
const Globe = lazy(() =>
  import("@/components/Globe").then((m) => ({ default: m.Globe })),
);

const BASE = (import.meta as any).env?.BASE_URL ?? "/";
const LOGO_URL = `${BASE.replace(/\/$/, "")}/logo.png`;

function LiveDealTicker() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % DEALS.length), 2400);
    return () => clearInterval(t);
  }, []);
  // Show 4 deals at once, rotating.
  const visible = [
    DEALS[idx % DEALS.length],
    DEALS[(idx + 1) % DEALS.length],
    DEALS[(idx + 2) % DEALS.length],
    DEALS[(idx + 3) % DEALS.length],
  ];
  return (
    <div className="w-full max-w-3xl mx-auto space-y-2">
      <div className="text-ui-caps text-cyan-300/80 flex items-center gap-2 justify-center">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
        Live deals · global market
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {visible.map((d, i) => (
          <div
            key={`${d.id}-${i}`}
            className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-md bg-white/5 border border-white/10 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-1"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="text-[10px] text-ui-caps text-white/45 w-16 shrink-0">{d.category}</div>
              <div className="min-w-0">
                <div className="text-sm text-white truncate">{d.asset}</div>
                <div className="text-ui-meta text-white/50">
                  {d.city} to {d.buyerCity}
                </div>
              </div>
            </div>
            <div className="text-sm font-sans tabular-nums font-medium text-cyan-300 shrink-0">{d.price}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] bg-[hsl(222,47%,6%)] text-white relative overflow-hidden">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[1100px] h-[1100px] rounded-full bg-accent/15 blur-[140px]" />
        <div className="absolute bottom-[-200px] right-[-100px] w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-[120px]" />
      </div>

      {/* Top nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-white/95 flex items-center justify-center shadow ring-1 ring-accent/40">
            <img src={LOGO_URL} alt="ValYoued" className="h-6 w-6 object-contain" />
          </div>
          <div className="leading-tight">
            <div className="text-xl font-brand font-semibold tracking-tight">ValYoued</div>
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <Link href="/about">
            <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10" data-testid="nav-about">
              How it works
            </Button>
          </Link>
          <Link href="/sign-in">
            <Button variant="ghost" className="text-white hover:bg-white/10" data-testid="nav-sign-in">
              Sign in
            </Button>
          </Link>
            <Link href="/start">
              <Button className="bg-accent hover:bg-accent/90" data-testid="nav-get-started">
              Get a free valuation <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 px-6 pt-8 pb-12 max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-5">
          <Badge variant="outline" className="border-accent/35 bg-accent/10 text-accent-foreground px-3 py-1 text-ui-caps">
            Multi-asset valuations
          </Badge>
          <h1
            className="text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05] text-white"
            style={{ fontFamily: "var(--app-font-display)" }}
          >
            Know what it&apos;s worth.
            <br />
            Sell with confidence.
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            Turn your assets into opportunities with real-time AI valuation, global markets, and
            smart portfolio growth.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
            <Link href="/start">
              <Button
                size="lg"
                className="h-12 px-6 text-base bg-accent hover:bg-accent/90"
                data-testid="hero-start-cta"
              >
                Start your first valuation <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-6 text-base border-white/20 bg-white/5 hover:bg-white/10 text-white"
              >
                I have an account
              </Button>
            </Link>
          </div>
        </div>

        {/* Globe + ticker */}
        <div className="mt-10 relative">
          <Suspense
            fallback={
              <div className="h-[560px] flex items-center justify-center">
                <div className="h-12 w-12 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
              </div>
            }
          >
            <Globe height={560} />
          </Suspense>
          <div className="mt-2">
            <LiveDealTicker />
          </div>
        </div>
      </section>

      {/* Feature row */}
      <section className="relative z-10 px-6 pb-24 max-w-5xl mx-auto">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: Globe2,
              title: "Global price discovery",
              body:
                "We compare your asset against listings, auctions, and registries across 30+ markets to find where it's worth most.",
            },
            {
              icon: Zap,
              title: "From photo to valuation",
              body:
                "Snap a picture and our vision model fills out the spec sheet. A full report with arbitrage notes in under a minute.",
            },
            {
              icon: ShieldCheck,
              title: "Listing-ready ad copy",
              body:
                "Choose a marketplace and we generate a buyer-tested ad: title, description, hashtags, photo tips, and a one-click jump into their listing form.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm hover:border-accent/30 transition-colors"
            >
              <div className="h-10 w-10 rounded-lg bg-accent/15 text-accent flex items-center justify-center mb-3">
                <f.icon className="h-5 w-5" />
              </div>
              <div className="text-base font-semibold mb-1">{f.title}</div>
              <div className="text-sm text-white/60">{f.body}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 px-6 pb-10 max-w-5xl mx-auto border-t border-white/10 pt-8 flex flex-col sm:flex-row gap-4 justify-between items-center text-sm text-white/50">
        <span>© {new Date().getFullYear()} ValYoued</span>
        <div className="flex gap-6">
          <Link href="/privacy" className="hover:text-white transition-colors">
            Privacy
          </Link>
          <Link href="/about" className="hover:text-white transition-colors">
            How it works
          </Link>
        </div>
      </footer>
    </div>
  );
}
