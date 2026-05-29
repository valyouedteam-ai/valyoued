import { Link } from "wouter";
import type { EstimateSummary, EstimateStats } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/format";
import { formatUsdRollupForDisplay } from "@/lib/aggregated-money";
import { useDisplayCurrency } from "@/hooks/use-display-currency";
import { mergePortfolioHref, usePortfolioWorkspace } from "@/context/PortfolioWorkspaceContext";

type PortfolioHealthStripProps = {
  health: EstimateStats["portfolioHealth"];
  fxMult: Readonly<Record<string, number>> | null | undefined;
  estimates: EstimateSummary[];
  className?: string;
};

function countMatching(
  estimates: EstimateSummary[],
  pred: (e: EstimateSummary) => boolean,
): number {
  return estimates.filter(pred).length;
}

export function PortfolioHealthStrip({ health, fxMult, estimates, className }: PortfolioHealthStripProps) {
  const { code: displayCcy } = useDisplayCurrency();
  const { portfolioQuerySuffix } = usePortfolioWorkspace();

  if (!health) return null;

  const fmt = (usd: number) => formatUsdRollupForDisplay(usd, displayCcy, fxMult);

  const tiles = [
    {
      label: "Total value",
      value: fmt(health.totalPortfolioUsd),
      href: mergePortfolioHref("/dashboard", portfolioQuerySuffix),
    },
    {
      label: "Value growth",
      value: formatPercent(health.valueGrowthPct),
      href: mergePortfolioHref("/dashboard", portfolioQuerySuffix),
    },
    {
      label: "Resale strength",
      value: `${health.resaleStrengthIndex}/100`,
      href: mergePortfolioHref("/dashboard", portfolioQuerySuffix),
    },
    {
      label: "Diversification",
      value: `${health.diversificationScore}/100`,
      href: mergePortfolioHref("/dashboard", portfolioQuerySuffix),
    },
    {
      label: "Underinsured",
      value: String(health.underinsuredCount),
      href: mergePortfolioHref("/dashboard?filter=underinsured", portfolioQuerySuffix),
      highlight: health.underinsuredCount > 0,
    },
    {
      label: "Missing receipts",
      value: String(health.missingReceiptsCount),
      href: mergePortfolioHref("/dashboard?filter=receipts", portfolioQuerySuffix),
      highlight: health.missingReceiptsCount > 0,
    },
    {
      label: "Needs revaluation",
      value: String(health.needsRevaluationCount),
      href: mergePortfolioHref("/dashboard?filter=stale", portfolioQuerySuffix),
      highlight: health.needsRevaluationCount > 0,
    },
  ];

  return (
    <section className={cn("rounded-xl border border-border/60 bg-card/60 p-4 backdrop-blur sm:p-5", className)}>
      <h2 className="text-base font-semibold text-foreground">Portfolio health</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {countMatching(estimates, (e) => (e.confidenceScore ?? 0) >= 70)} of {estimates.length} holdings have strong
        confidence scores.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className={cn(
              "rounded-xl border border-border/50 bg-background/80 px-3 py-3 transition-colors hover:border-accent/40",
              t.highlight && "border-amber-500/40 bg-amber-500/[0.06]",
            )}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.label}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{t.value}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
