import { Link } from "wouter";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MarketingPlanCardDef } from "@/lib/marketing-plan-tiers";
import {
  MAIN_PLAN_CARDS,
  INHERITANCE_ADDON_CARD,
  PROFESSIONAL_TRIAL_DAYS_DEFAULT,
} from "@/lib/marketing-plan-tiers";

export type MarketingPlanCardsProps = {
  /** When true (pricing page), show full header block. Landing uses slim band. */
  layout?: "page" | "band";
  className?: string;
  /** Defaults to MAIN + inheritance add-on strip */
  cards?: MarketingPlanCardDef[];
  addon?: MarketingPlanCardDef | null;
};

export function MarketingPlanCards({
  layout = "page",
  cards = MAIN_PLAN_CARDS,
  addon = INHERITANCE_ADDON_CARD,
  className,
}: MarketingPlanCardsProps) {
  const showAddon = addon != null && layout === "page";

  return (
    <section
      id="plans"
      className={cn(
        layout === "page" ? "relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6" : "relative z-10 w-full",
        className,
      )}
    >
      <div
        className={cn(
          "rounded-3xl border border-border/60 bg-[hsl(40,25%,96%)]/92 shadow-xl shadow-black/10 backdrop-blur-md dark:bg-card/92",
          layout === "band" ? "p-5 sm:p-6" : "p-4",
        )}
      >
        {layout === "page" ? (
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-ui-caps text-accent">Straightforward tiers</p>
              <h2 className="mt-1 text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Everyday free stays honest: five valuations a month plus basics. Everyday+ lifts limits and unlocks richer
                market rows.
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                Trial length for Professional defaults to about {PROFESSIONAL_TRIAL_DAYS_DEFAULT} days at Stripe checkout unless
                your deployment overrides it with STRIPE_PROFESSIONAL_TRIAL_DAYS.
              </p>
            </div>
            <Badge variant="secondary" className="w-fit shrink-0 border border-border/70">
              Paid subscriptions
            </Badge>
          </div>
        ) : (
          <div className="mb-5 space-y-1 text-center sm:text-left">
            <p className="text-ui-caps text-accent">Plans at a glance</p>
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Pick the runway that fits you</h2>
            <p className="text-sm text-muted-foreground">
              Free Everyday keeps you experimenting. Everyday+ expands tooling. Professional adds trials, desks, and seller-grade
              copy.
            </p>
          </div>
        )}

        <div className={`grid gap-4 ${layout === "band" ? "md:grid-cols-3" : "md:grid-cols-3"}`}>
          {cards.map((p) => (
            <PlanCardRow key={p.title} card={p} />
          ))}
        </div>

        {showAddon && addon ? (
          <div className="mt-6 border-t border-border/60 pt-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Optional add-on</p>
            <div className="grid gap-4 md:max-w-md">
              <PlanCardRow card={addon} />
            </div>
          </div>
        ) : layout === "band" && addon ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border/70 bg-muted/15 p-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{addon.title}.</span>{" "}
            {addon.bullets.slice(0, 2).join(" ")}{" "}
            <Link href="/pricing#plans" className="font-medium text-accent underline-offset-4 hover:underline">
              Read full pricing
            </Link>
            .
          </div>
        ) : null}
      </div>
    </section>
  );
}

function PlanCardRow({ card: p }: { card: MarketingPlanCardDef }) {
  return (
    <Card
      className={`border-border/70 bg-card/98 shadow-sm backdrop-blur ${p.highlight ? "md:ring-1 md:ring-accent/35" : ""}`}
    >
      <CardHeader className="space-y-1 pb-3">
        <CardTitle className="text-lg font-semibold">{p.title}</CardTitle>
        {p.subtitle ? <CardDescription>{p.subtitle}</CardDescription> : null}
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
  );
}
