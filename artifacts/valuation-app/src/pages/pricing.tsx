import { Link } from "wouter";
import { Check } from "lucide-react";
import { MarketingTopNav } from "@/components/layout/MarketingTopNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function PricingTierGrid() {
  return (
    <section className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6">
      <div className="rounded-3xl border border-border/60 bg-[hsl(40,25%,96%)]/92 p-4 shadow-xl shadow-black/10 backdrop-blur-md dark:bg-card/92">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-ui-caps text-accent">Straightforward tiers</p>
            <h1 className="mt-1 text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Everyday free caps at five valuations/month. Upgrade removes the leash
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Trials and invoiced amounts are confirmed at checkout. GBP figures below are illustrative for the tiers we offer.
            </p>
          </div>
          <Badge variant="secondary" className="w-fit shrink-0 border border-border/70">
            Paid subscriptions
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
              bullets: ["Seller-grade listing tone presets", "Pro desk workspaces", "Introductory trial length set in billing config"],
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

export default function PricingPage() {
  return (
    <div className="min-h-[100dvh] bg-[hsl(40,20%,97%)] text-foreground">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-[20%] top-0 h-[min(70vh,520px)] w-[70%] rounded-full bg-[radial-gradient(ellipse_at_center,hsl(175_45%_45%/0.12),transparent_70%)] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[min(60vh,480px)] w-[55%] rounded-full bg-[radial-gradient(ellipse_at_center,hsl(258_45%_55%/0.08),transparent_70%)] blur-3xl" />
      </div>

      <MarketingTopNav variant="light" />

      <PricingTierGrid />

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
            Tailor signup
          </Link>
        </div>
      </footer>
    </div>
  );
}
