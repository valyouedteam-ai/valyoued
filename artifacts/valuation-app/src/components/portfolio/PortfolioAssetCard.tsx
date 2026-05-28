import { Link } from "wouter";
import type { EstimateSummary } from "@workspace/api-client-react";
import { ArrowRight, Megaphone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { mergePortfolioHref, usePortfolioWorkspace } from "@/context/PortfolioWorkspaceContext";

const ACTION_LABEL: Record<string, string> = {
  sell: "Sell",
  hold: "Hold",
  insure: "Insure",
};

const RESALE_TONE: Record<string, string> = {
  strong: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  moderate: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
  low: "bg-muted text-muted-foreground",
};

export function PortfolioAssetCard({
  item,
  portfolioAnalytics,
}: {
  item: EstimateSummary;
  portfolioAnalytics?: boolean;
}) {
  const { portfolioQuerySuffix } = usePortfolioWorkspace();
  const low = item.adjustedLow ?? item.adjustedMid;
  const high = item.adjustedHigh ?? item.adjustedMid;
  const confidence = item.confidenceScore ?? null;

  return (
    <article className="rounded-2xl border border-border/60 bg-dashboard-elevated p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={mergePortfolioHref(`/estimates/${item.id}`, portfolioQuerySuffix)}
            className="truncate text-base font-semibold text-foreground hover:text-accent"
          >
            {item.title}
          </Link>
          <p className="mt-0.5 text-sm text-muted-foreground">{item.assetTypeName}</p>
        </div>
        {item.actionRecommendation ? (
          <Badge variant="outline" className="shrink-0 capitalize">
            {ACTION_LABEL[item.actionRecommendation] ?? item.actionRecommendation}
          </Badge>
        ) : null}
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {formatMoney(item.adjustedMid, item.currency, true)}
          </p>
          <p className="text-sm text-muted-foreground">
            Range {formatMoney(low, item.currency, true)} to {formatMoney(high, item.currency, true)}
          </p>
        </div>
        {confidence != null ? (
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Confidence</p>
            <p className="text-xl font-semibold tabular-nums text-accent">{confidence}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-accent/80"
          style={{ width: `${Math.min(100, Math.max(8, confidence ?? 40))}%` }}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {item.resalePotential ? (
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", RESALE_TONE[item.resalePotential])}>
            {item.resalePotential} resale potential
          </span>
        ) : null}
        {item.valuationFreshness === "stale" ? (
          <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-300">
            Needs revaluation
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="rounded-full" asChild>
          <Link href={mergePortfolioHref(`/estimates/${item.id}`, portfolioQuerySuffix)}>
            Open report
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
        {portfolioAnalytics ? (
          <Button size="sm" variant="secondary" className="rounded-full" asChild>
            <Link href={mergePortfolioHref(`/estimates/${item.id}?refine=1`, portfolioQuerySuffix)}>
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Improve accuracy
            </Link>
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" className="rounded-full" asChild>
          <Link href={mergePortfolioHref(`/estimates/${item.id}?listing=1`, portfolioQuerySuffix)}>
            <Megaphone className="mr-1.5 h-3.5 w-3.5" />
            Draft ad
          </Link>
        </Button>
      </div>
    </article>
  );
}
