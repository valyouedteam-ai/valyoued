import type { PortfolioAnalytics } from "@workspace/api-client-react";

const WEIGHTS = {
  fieldCompleteness: 40,
  compQuality: 35,
  marketStability: 25,
} as const;

type ConfidenceBreakdownProps = {
  analytics: PortfolioAnalytics;
  className?: string;
};

export function ConfidenceBreakdown({ analytics, className }: ConfidenceBreakdownProps) {
  const bd = analytics.confidenceBreakdown;
  const fc = analytics.fieldCompleteness;
  if (analytics.confidenceScore == null || !bd) return null;

  const rows = [
    {
      label: "Input details",
      weight: WEIGHTS.fieldCompleteness,
      score: bd.fieldCompleteness ?? fc?.pct ?? 0,
      detail:
        fc?.missing?.length && fc.missing.length <= 4
          ? `Missing: ${fc.missing.join(", ")}`
          : fc?.pct != null
            ? `${fc.pct}% of tracked inputs complete`
            : "How complete your wizard inputs are",
    },
    {
      label: "Comparable quality",
      weight: WEIGHTS.compQuality,
      score: bd.compQuality ?? 0,
      detail: "Recency and relevance of similar sales on the report",
    },
    {
      label: "Market stability",
      weight: WEIGHTS.marketStability,
      score: bd.marketStability ?? 0,
      detail: "How tightly comp prices cluster (wider spread lowers stability)",
    },
  ];

  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground">
        Confidence {analytics.confidenceScore}/100 = {WEIGHTS.fieldCompleteness}% input details +{" "}
        {WEIGHTS.compQuality}% comp quality + {WEIGHTS.marketStability}% market stability
      </p>
      <ul className="mt-2 space-y-2 text-sm">
        {rows.map((row) => (
          <li key={row.label} className="rounded-lg border border-border/60 bg-muted/15 px-3 py-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium text-foreground">{row.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {row.score}/100 · {row.weight}% weight
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{row.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
