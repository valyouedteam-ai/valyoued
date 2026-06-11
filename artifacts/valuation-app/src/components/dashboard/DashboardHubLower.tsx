import { useMemo } from "react";
import { Link, useLocation } from "wouter";
import type { EstimateSummary } from "@workspace/api-client-react";
import { mergePortfolioHref, usePortfolioWorkspace } from "@/context/PortfolioWorkspaceContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Car,
  Gem,
  Lock,
  Megaphone,
  Package,
  Palette,
  Shirt,
  ShoppingBag,
  Sparkles,
  TvMinimal,
  Watch,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useSellerPersona } from "@/hooks/use-seller-persona";
import { useBillingSummary } from "@/hooks/use-billing-summary";
import type { HomeBucketKey } from "@/lib/home-buckets";
import { HOME_BUCKET_LABEL, HOME_BUCKET_ORDER, countItemsByBucket } from "@/lib/home-buckets";
import { PaidFeatureTeaser } from "@/components/home/PaidFeatureTeaser";
import { buildEstimateNewHref } from "@/components/dashboard/DashboardNextStep";

const BUCKET_ICONS: Record<HomeBucketKey, typeof Gem> = {
  jewellery: Watch,
  luxuryBags: ShoppingBag,
  cars: Car,
  electronics: TvMinimal,
  antiques: Palette,
  clothing: Shirt,
  collectibles: Sparkles,
  other: Package,
};

/** Lower dashboard sections: asset buckets, ads, inheritance upsell. */
export function DashboardHubLower({
  scopedEstimates,
  estimatesLoading: _estimatesLoading,
}: {
  scopedEstimates: EstimateSummary[];
  estimatesLoading: boolean;
}) {
  const [, navigate] = useLocation();
  const reduceMotion = useReducedMotion();
  const { isProfessional } = useSellerPersona();
  const { data: billing } = useBillingSummary();
  const billingPaid = Boolean(billing?.hasPaidValuationTier);
  const { portfolioQuerySuffix } = usePortfolioWorkspace();

  const bucketCounts = useMemo(
    () => countItemsByBucket(scopedEstimates.map((f) => f.assetTypeName)),
    [scopedEstimates],
  );

  const showingInheritanceUpsell = !isProfessional && !billing?.hasInheritanceAddon;

  function openRecentForBucket(key: HomeBucketKey) {
    navigate(mergePortfolioHref(`/estimates?bucket=${encodeURIComponent(key)}`, portfolioQuerySuffix));
  }

  return (
    <div className="mt-14 space-y-12 border-t border-border/50 pt-12">
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Asset buckets</h2>
          </div>
          <Button size="sm" variant="secondary" className="rounded-full" asChild>
            <Link href={buildEstimateNewHref(portfolioQuerySuffix)}>Add item</Link>
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {HOME_BUCKET_ORDER.map((key) => {
            const Icon = BUCKET_ICONS[key];
            const count = bucketCounts[key];
            const empty = count === 0;
            return (
              <motion.div
                key={key}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
                whileInView={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-5%" }}
                transition={{ duration: 0.3 }}
              >
                {empty ? (
                  <Link
                    href={buildEstimateNewHref(portfolioQuerySuffix, key)}
                    className={cn(
                      "block w-full rounded-2xl border border-dashed border-accent/35 bg-accent/5 p-4 text-left shadow-sm transition-colors",
                      "hover:border-accent/55 hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
                    )}
                  >
                    <BucketCardInner Icon={Icon} keyName={key} count={count} empty />
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => openRecentForBucket(key)}
                    className={cn(
                      "block w-full rounded-2xl border border-border/60 bg-dashboard-elevated p-4 text-left shadow-sm transition-colors",
                      "hover:border-accent/35 hover:bg-card/85",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
                    )}
                  >
                    <BucketCardInner Icon={Icon} keyName={key} count={count} empty={false} />
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      </section>

      <section aria-label="Ads and monitors">
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Ads &amp; monitors</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Free still drafts humane ads. Alerts for monitored holdings unlock with Everyday.
            </p>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" className="h-auto flex-col items-start rounded-2xl py-4 text-left" asChild>
              <Link href={mergePortfolioHref("/listings", portfolioQuerySuffix)}>
                <span className="text-sm font-semibold">Ads</span>
                <span className="text-xs text-muted-foreground">Copy blocks</span>
              </Link>
            </Button>
            {billingPaid ? (
              <Button variant="outline" className="h-auto flex-col items-start rounded-2xl py-4 text-left" asChild>
                <Link href={mergePortfolioHref("/settings", portfolioQuerySuffix)}>
                  <span className="text-sm font-semibold">Email alerts</span>
                  <span className="text-xs text-muted-foreground">Monitor pings</span>
                </Link>
              </Button>
            ) : (
              <div className="relative overflow-hidden rounded-2xl border border-dashed border-border/70 p-4 text-left">
                <div className="pointer-events-none absolute inset-0 bg-background/70 backdrop-blur-sm" aria-hidden />
                <div className="relative space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Lock className="h-4 w-4 text-accent" />
                    Email monitor alerts
                  </div>
                  <p className="text-xs text-muted-foreground">Holdings tagged monitor can ping you after upgrade.</p>
                  <Button size="sm" variant="secondary" className="w-full rounded-lg" asChild>
                    <Link href="/settings">Unlock with Everyday</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {showingInheritanceUpsell ? (
        <PaidFeatureTeaser
          eyebrow="Everyday steward boost"
          title="Separate inheritance ledger"
          description="Activate the add-on in Settings to spin up a second workspace for estate rehearsal, heirs, or heirloom tracking."
          href="/settings"
        />
      ) : null}
    </div>
  );
}

function BucketCardInner({
  Icon,
  keyName,
  count,
  empty,
}: {
  Icon: typeof Gem;
  keyName: HomeBucketKey;
  count: number;
  empty: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="space-y-1">
        <p className="text-base font-medium leading-snug text-foreground">{HOME_BUCKET_LABEL[keyName]}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums text-foreground">{count}</span>
          <span className="text-sm text-muted-foreground">items</span>
        </div>
        <p className={cn("text-sm", empty ? "font-medium text-accent" : "text-muted-foreground")}>
          {empty
            ? `Add your first ${HOME_BUCKET_LABEL[keyName].toLowerCase()} item`
            : `${count} saved here · tap to filter collection`}
        </p>
      </div>
    </div>
  );
}
