import { useAuth } from "@clerk/react";
import { Link } from "wouter";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { AUTH_STUB_MODE } from "@/lib/auth-stub";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MarketingPlanCardDef } from "@/lib/marketing-plan-tiers";
import {
  MAIN_PLAN_CARDS,
  INHERITANCE_ADDON_CARD,
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
  /** Defaults to MAIN + inheritance add-on strip */
  cards?: MarketingPlanCardDef[];
  addon?: MarketingPlanCardDef | null;
};

function MarketingPlanCardsInner({
  cards = MAIN_PLAN_CARDS,
  addon = INHERITANCE_ADDON_CARD,
  className,
  isSignedIn,
}: MarketingPlanCardsProps & { isSignedIn: boolean }) {
  const showAddon = addon != null;
  const addonShown = resolveAddonForAuth(addon, isSignedIn);

  return (
    <section
      id="plans"
      className={cn(
        "relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6",
        className,
      )}
    >
      <div
        className={cn(
          "rounded-3xl border border-border/60 bg-[hsl(40,25%,96%)]/92 p-4 shadow-xl shadow-black/10 backdrop-blur-md dark:bg-card/92",
        )}
      >
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="w-full min-w-0 flex-1 space-y-2">
            <p className="text-ui-caps text-accent">Straightforward tiers</p>
            <h2 className="mt-1 w-full max-w-none text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Free tier for light use. Everyday+ and Professional add more when you need it.
            </h2>
          </div>
          <Badge variant="secondary" className="w-fit shrink-0 self-start border border-border/70 sm:self-end">
            Paid subscriptions
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {cards.map((p) => (
            <PlanCardRow key={p.title} card={p} />
          ))}
        </div>

        {showAddon && addonShown ? (
          <div className="mt-6 border-t border-border/60 pt-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Optional add-on</p>
            <div className="grid gap-4 md:max-w-md">
              <PlanCardRow card={addonShown} />
            </div>
          </div>
        ) : null}
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
