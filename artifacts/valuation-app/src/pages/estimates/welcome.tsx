import { Link, Redirect, useParams } from "wouter";
import {
  useGetEstimate,
  useGetEstimateStats,
  getGetEstimateQueryKey,
} from "@workspace/api-client-react";
import { ArrowRight, Shield, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney, formatPercent } from "@/lib/format";
import { formatUsdRollupForDisplay } from "@/lib/aggregated-money";
import { useDisplayCurrency } from "@/hooks/use-display-currency";
import { useGetFxRates, getGetFxRatesQueryKey } from "@workspace/api-client-react";
import { useBillingSummary } from "@/hooks/use-billing-summary";
import { mergePortfolioHref, usePortfolioWorkspace } from "@/context/PortfolioWorkspaceContext";
import { PageTitle } from "@/components/layout/PageTitle";

const ACTION_COPY = {
  sell: { label: "Sell", icon: TrendingUp, tone: "text-rose-600" },
  hold: { label: "Hold", icon: Sparkles, tone: "text-emerald-600" },
  insure: { label: "Insure", icon: Shield, tone: "text-violet-600" },
} as const;

export default function EstimateWelcomePage() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const { data: billing } = useBillingSummary();
  const paid = Boolean(billing?.canUsePortfolioAnalytics);
  const { portfolioQuerySuffix } = usePortfolioWorkspace();
  const { code: displayCcy } = useDisplayCurrency();

  const { data: estimate, isLoading } = useGetEstimate(id, {
    query: { enabled: !!id, queryKey: getGetEstimateQueryKey(id) },
  });
  const { data: stats } = useGetEstimateStats();
  const { data: fxSnap } = useGetFxRates({
    query: { queryKey: getGetFxRatesQueryKey(), staleTime: 30 * 60 * 1000 },
  });

  if (!id) return <Redirect to="/dashboard" />;

  if (isLoading || !estimate) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  const analytics = estimate.portfolioAnalytics;
  const action = analytics?.actionRecommendation ?? "hold";
  const ActionIcon = ACTION_COPY[action].icon;
  const comps = estimate.comparables?.slice(0, 3) ?? [];
  const portfolioTotal = stats?.portfolioHealth?.totalPortfolioUsd;
  const fmtRollup = (usd: number) => formatUsdRollupForDisplay(usd, displayCcy, fxSnap?.rates);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 pb-20">
      <header className="space-y-2">
        <p className="text-ui-caps text-accent">Added to portfolio</p>
        <PageTitle>{estimate.input.title}</PageTitle>
        <p className="text-muted-foreground">
          {paid
            ? "Your asset is in the portfolio with a live confidence score and action hint."
            : "Preview your portfolio moment. Upgrade to Everyday for full analytics."}
        </p>
      </header>

      <Card className={paid ? "border-accent/30" : "border-dashed opacity-95"}>
        <CardContent className="space-y-6 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Current value</p>
              <p className="text-3xl font-semibold tabular-nums">
                {formatMoney(estimate.adjustedMid, estimate.currency, true)}
              </p>
              <p className="text-sm text-muted-foreground">
                Range {formatMoney(estimate.adjustedLow, estimate.currency, true)} to{" "}
                {formatMoney(estimate.adjustedHigh, estimate.currency, true)}
              </p>
            </div>
            {paid && analytics ? (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Confidence</p>
                <p className="text-3xl font-semibold tabular-nums text-accent">{analytics.confidenceScore}</p>
              </div>
            ) : (
              <Badge variant="secondary">Everyday unlocks confidence</Badge>
            )}
          </div>

          {paid && analytics?.confidenceBreakdown ? (
            <div className="flex flex-wrap gap-2">
              {[
                ["Fields", analytics.confidenceBreakdown.fieldCompleteness],
                ["Comps", analytics.confidenceBreakdown.compQuality],
                ["Stability", analytics.confidenceBreakdown.marketStability],
              ].map(([label, score]) => (
                <span key={label} className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                  {label} {score}%
                </span>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            {analytics?.resalePotential ? (
              <Badge variant="outline" className="capitalize">
                {analytics.resalePotential} resale potential
              </Badge>
            ) : null}
            <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${ACTION_COPY[action].tone}`}>
              <ActionIcon className="h-4 w-4" />
              Suggested: {ACTION_COPY[action].label}
            </span>
          </div>

          {portfolioTotal != null ? (
            <p className="rounded-xl bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              Portfolio total now about{" "}
              <span className="font-semibold text-foreground">{fmtRollup(portfolioTotal)}</span>
              {stats?.portfolioHealth?.valueGrowthPct != null ? (
                <> ({formatPercent(stats.portfolioHealth.valueGrowthPct)} vs baseline)</>
              ) : null}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {comps.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Similar sold items</h2>
          <ul className="space-y-2">
            {comps.map((c, i) => (
              <li key={i} className="rounded-xl border border-border/60 px-4 py-3 text-sm">
                <span className="font-medium">{formatMoney(c.price, estimate.currency, true)}</span>
                <span className="text-muted-foreground"> · {c.source}</span>
                {c.relevanceExplanation ? (
                  <p className="mt-1 text-xs text-muted-foreground">{c.relevanceExplanation}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button size="lg" className="rounded-full" asChild>
          <Link href={mergePortfolioHref("/dashboard", portfolioQuerySuffix)}>
            View portfolio
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button size="lg" variant="outline" className="rounded-full" asChild>
          <Link href={mergePortfolioHref(`/estimates/${id}`, portfolioQuerySuffix)}>Open full report</Link>
        </Button>
        {!paid ? (
          <Button size="lg" variant="secondary" className="rounded-full" asChild>
            <Link href="/pricing#plans">Unlock Everyday</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
