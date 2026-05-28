import { useState } from "react";
import { useAuth } from "@clerk/react";
import { Link } from "wouter";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { AUTH_STUB_MODE } from "@/lib/auth-stub";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { MarketingPlanCardDef } from "@/lib/marketing-plan-tiers";
import {
  MAIN_PLAN_CARDS,
  INHERITANCE_ADDON_CARD,
  PLAN_COMPARE_ROWS,
  PRICING_FAQ,
  PROFESSIONAL_TRIAL_DAYS_DEFAULT,
} from "@/lib/marketing-plan-tiers";

function resolveAddonForAuth(card: MarketingPlanCardDef | null | undefined, isSignedIn: boolean): MarketingPlanCardDef | null | undefined {
  if (!card) return card;
  if (!isSignedIn || !card.authenticatedCta) return card;
  return {
    ...card,
    ctaLabel: card.authenticatedCta.label,
    ctaHref: card.authenticatedCta.href,
  };
}

export type MarketingPlanCardsProps = {
  className?: string;
  cards?: MarketingPlanCardDef[];
  addon?: MarketingPlanCardDef | null;
};

function MarketingPlanCardsInner({
  cards = MAIN_PLAN_CARDS,
  addon = INHERITANCE_ADDON_CARD,
  className,
  isSignedIn,
}: MarketingPlanCardsProps & { isSignedIn: boolean }) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const showAddon = addon != null;
  const addonShown = resolveAddonForAuth(addon, isSignedIn);

  function displayPrice(card: MarketingPlanCardDef): string {
    if (card.price === "£0") return card.price;
    if (billingCycle === "annual" && card.priceAnnual) {
      return `${card.priceAnnual} billed yearly`;
    }
    return `${card.price} billed monthly`;
  }

  return (
    <section id="plans" className={cn("relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6", className)}>
      <div className="mb-10 max-w-2xl">
        <p className="text-ui-caps text-accent">Simple pricing</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Start free. Upgrade when your portfolio grows.
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
          Cancel or switch plans anytime. Professional includes a {PROFESSIONAL_TRIAL_DAYS_DEFAULT}-day trial.
        </p>
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full border border-border/70 bg-muted/40 p-1">
          <button
            type="button"
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              billingCycle === "monthly" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
            )}
            onClick={() => setBillingCycle("monthly")}
          >
            Pay monthly
          </button>
          <button
            type="button"
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              billingCycle === "annual" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
            )}
            onClick={() => setBillingCycle("annual")}
          >
            Pay annually
          </button>
        </div>
        {billingCycle === "annual" ? (
          <Badge variant="secondary" className="rounded-full border border-border/70">
            Save ~15% (annual reference pricing)
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((p) => (
          <PlanCardRow key={p.title} card={p} priceLabel={displayPrice(p)} />
        ))}
      </div>

      {showAddon && addonShown ? (
        <div className="mt-8 border-t border-border/60 pt-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Optional add-on</p>
          <div className="grid gap-4 md:max-w-md">
            <PlanCardRow card={addonShown} priceLabel={addonShown.price} />
          </div>
        </div>
      ) : null}

      <div className="mt-16">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Compare plans</h2>
        <p className="mt-2 text-sm text-muted-foreground">Feature matrix for Everyday Free, Everyday+, and Professional.</p>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border/70 bg-card/80">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="px-4 py-3 font-semibold text-foreground">Feature</th>
                <th className="px-4 py-3 font-semibold text-foreground">Free</th>
                <th className="px-4 py-3 font-semibold text-foreground">Everyday+</th>
                <th className="px-4 py-3 font-semibold text-foreground">Professional</th>
              </tr>
            </thead>
            <tbody>
              {PLAN_COMPARE_ROWS.map((row) => (
                <tr key={row.label} className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{row.label}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.free}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.everyday_plus}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.professional}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-16 max-w-3xl">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Questions?</h2>
        <Accordion type="single" collapsible className="mt-4">
          {PRICING_FAQ.map((item) => (
            <AccordionItem key={item.question} value={item.question}>
              <AccordionTrigger className="text-base font-medium">{item.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function MarketingPlanCardsWithClerk(props: MarketingPlanCardsProps) {
  const { isSignedIn } = useAuth();
  return <MarketingPlanCardsInner {...props} isSignedIn={Boolean(isSignedIn)} />;
}

export function MarketingPlanCards(props: MarketingPlanCardsProps) {
  if (AUTH_STUB_MODE) {
    return <MarketingPlanCardsInner {...props} isSignedIn={false} />;
  }
  return <MarketingPlanCardsWithClerk {...props} />;
}

function PlanCardRow({ card: p, priceLabel }: { card: MarketingPlanCardDef; priceLabel: string }) {
  return (
    <Card
      className={cn(
        "relative border-border/70 bg-card/98 shadow-sm backdrop-blur",
        p.highlight && "md:ring-2 md:ring-accent/40 md:shadow-lg",
      )}
    >
      {p.popularLabel ? (
        <Badge className="absolute -top-3 left-4 rounded-full bg-accent text-accent-foreground shadow-sm">
          {p.popularLabel}
        </Badge>
      ) : null}
      <CardHeader className="space-y-1 pb-3">
        <CardTitle className="text-lg font-semibold">{p.title}</CardTitle>
        {p.subtitle ? <CardDescription>{p.subtitle}</CardDescription> : null}
        <CardDescription className="text-xl font-semibold tabular-nums text-foreground">{priceLabel}</CardDescription>
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
