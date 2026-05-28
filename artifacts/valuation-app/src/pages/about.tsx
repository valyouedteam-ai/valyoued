import { Link } from "wouter";
import { Sparkles } from "lucide-react";
import { MarketingTopNav } from "@/components/layout/MarketingTopNav";
import { ProductWalkthrough } from "@/components/marketing/ProductWalkthrough";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AboutPage() {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[hsl(222,32%,8%)] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-[20%] top-0 h-[min(70vh,520px)] w-[70%] rounded-full bg-[radial-gradient(ellipse_at_center,hsl(175_45%_45%/0.15),transparent_70%)] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[min(60vh,480px)] w-[55%] rounded-full bg-[radial-gradient(ellipse_at_center,hsl(258_45%_55%/0.1),transparent_70%)] blur-3xl" />
      </div>

      <MarketingTopNav variant="dark" />

      <section className="relative z-10 mx-auto max-w-4xl space-y-5 px-6 pb-8 pt-12 text-center">
        <Badge
          variant="secondary"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-ui-caps tracking-normal text-white/80"
        >
          <Sparkles className="h-3 w-3 text-accent" aria-hidden />
          How ValYoued works
        </Badge>
        <h1 className="font-sans text-4xl font-semibold leading-[1.05] tracking-tight text-white md:text-6xl">
          From photo to <span className="brand-gradient">portfolio clarity</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-white/65">
          One platform for valuations, regional context, and listing drafts across collectibles and everyday assets.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link href="/start">
            <Button size="lg" className="rounded-full">
              Start free valuation
            </Button>
          </Link>
          <Link href="/pricing#plans">
            <Button size="lg" variant="outline" className="rounded-full border-white/20 bg-transparent text-white hover:bg-white/10">
              View pricing
            </Button>
          </Link>
        </div>
      </section>

      <ProductWalkthrough
        variant="dark"
        heading="Scroll through the flow"
        subheading="Each step mirrors what you do inside the app: capture, value, compare, list."
        className="pb-8"
      />

      <section className="relative z-10 mx-auto max-w-3xl px-6 pb-24 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Built for everyday stewards and professional desks</h2>
        <p className="mt-3 text-base leading-relaxed text-white/60">
          Everyday paths stay friendly and portfolio-first. Professional adds sharper arbitrage wording, separate desks, and
          listing-heavy shortcuts when you subscribe.
        </p>
        <Link href="/welcome" className="mt-6 inline-block">
          <Button variant="secondary" className="rounded-full">
            Pick your track before signup
          </Button>
        </Link>
      </section>

      <footer className="relative z-10 mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 border-t border-white/10 px-6 py-10 text-sm text-white/50 sm:flex-row">
        <span>© {new Date().getFullYear()} ValYoued</span>
        <div className="flex gap-8">
          <Link href="/pricing#plans" className="transition-colors hover:text-white">
            Pricing
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-white">
            Privacy
          </Link>
        </div>
      </footer>
    </div>
  );
}
