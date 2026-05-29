import { Link } from "wouter";
import type { EstimateSummary } from "@workspace/api-client-react";
import { ArrowRight, Megaphone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatPercent } from "@/lib/format";
import { iconForAssetType } from "@/lib/asset-icons";
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

type PortfolioAssetCardItem = EstimateSummary & {
  liveValue: number;
  changeFromBaseline: number;
};

export function PortfolioAssetCard({
  item,
  portfolioAnalytics,
  onListing,
}: {
  item: PortfolioAssetCardItem;
  portfolioAnalytics?: boolean;
  onListing?: () => void;
}) {
  const { portfolioQuerySuffix } = usePortfolioWorkspace();
  const isUp = item.changeFromBaseline >= 0;
  const estimateHref = mergePortfolioHref(`/estimates/${item.id}`, portfolioQuerySuffix);
  const low = item.adjustedLow ?? item.adjustedMid;
  const high = item.adjustedHigh ?? item.adjustedMid;
  const confidence = item.confidenceScore ?? null;
  const Icon = iconForAssetType(item.assetTypeName);

  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card/75 p-4 transition-colors hover:border-border hover:bg-card focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
      data-testid="asset-box"
    >
      <Link href={estimateHref} className="min-h-0 flex-1 rounded-lg outline-none">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/80 text-foreground/80">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="line-clamp-2 font-sans text-sm font-semibold leading-snug text-foreground group-hover:underline group-hover:decoration-muted-foreground/50 group-hover:underline-offset-2">
                {item.title}
              </h4>
              <p className="mt-1 font-sans text-[11px] text-muted-foreground">{item.assetTypeName}</p>
            </div>
          </div>
          {portfolioAnalytics && item.actionRecommendation ? (
            <Badge variant="outline" className="shrink-0 capitalize">
              {ACTION_LABEL[item.actionRecommendation] ?? item.actionRecommendation}
            </Badge>
          ) : null}
        </div>

        <div className="space-y-1">
          <div className="font-sans text-xl font-semibold tabular-nums leading-none text-foreground">
            {formatMoney(item.liveValue, item.currency)}
          </div>
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-xs">
            <span
              className={cn(
                "font-sans tabular-nums font-medium",
                isUp ? "text-emerald-800/80 dark:text-emerald-400/85" : "text-rose-800/85 dark:text-rose-400/85",
              )}
            >
              {formatPercent(item.changeFromBaseline, true)}
            </span>
            <span className="text-muted-foreground">· cost {formatMoney(item.baselineMid, item.currency)}</span>
          </div>
        </div>
      </Link>

      {portfolioAnalytics && (confidence != null || item.resalePotential || item.valuationFreshness === "stale") ? (
        <div className="mt-3 space-y-2 border-t border-border/35 pt-3">
          {confidence != null ? (
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">Confidence {confidence}</span>
              <span className="text-muted-foreground tabular-nums">
                Range {formatMoney(low, item.currency, true)} to {formatMoney(high, item.currency, true)}
              </span>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {item.resalePotential ? (
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                  RESALE_TONE[item.resalePotential],
                )}
              >
                {item.resalePotential} resale potential
              </span>
            ) : null}
            {item.valuationFreshness === "stale" ? (
              <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-300">
                Needs revaluation
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex items-center gap-2 border-t border-border/35 pt-3">
        <Button
          size="sm"
          variant="outline"
          className="h-8 flex-1 text-xs"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onListing?.();
          }}
          data-testid="box-listing-btn"
        >
          <Megaphone className="mr-1.5 h-3 w-3" />
          List for sale
        </Button>
        {portfolioAnalytics ? (
          <Button size="sm" variant="secondary" className="h-8 px-2.5 text-xs" asChild>
            <Link href={mergePortfolioHref(`/estimates/${item.id}?refine=1`, portfolioQuerySuffix)}>
              <Sparkles className="mr-1.5 h-3 w-3" />
              Refine
            </Link>
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" className="h-8 px-2" asChild>
          <Link href={estimateHref} aria-label="Open estimate">
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </article>
  );
}
