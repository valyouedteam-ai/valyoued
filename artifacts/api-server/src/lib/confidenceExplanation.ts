import type { PortfolioAnalytics } from "@workspace/api-zod";

/** Must match weights in portfolioAnalytics.ts */
export const CONFIDENCE_WEIGHTS = {
  fieldCompleteness: 40,
  compQuality: 35,
  marketStability: 25,
} as const;

export type ConfidenceBreakdownLine = {
  label: string;
  weightPct: number;
  score: number;
  detail: string;
};

export type MonitorValueAlertContent = {
  /** Short single-line summary for list previews. */
  summaryLine: string;
  /** Multi-paragraph plain text for portal notification body. */
  bodyPlain: string;
  upliftPct: number;
  confidenceScore: number | null;
  breakdownLines: ConfidenceBreakdownLine[];
  citationUrls: string[];
};

function formatMoneyPlain(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString()}`;
  }
}

function breakdownLinesFromAnalytics(analytics: PortfolioAnalytics): ConfidenceBreakdownLine[] {
  const bd = analytics.confidenceBreakdown;
  const fc = analytics.fieldCompleteness;
  const fieldScore = bd?.fieldCompleteness ?? fc?.pct ?? 0;
  const compScore = bd?.compQuality ?? 0;
  const stabilityScore = bd?.marketStability ?? 0;

  const missingHint =
    fc?.missing?.length && fc.missing.length <= 4
      ? `Missing: ${fc.missing.join(", ")}.`
      : fc?.missing?.length
        ? `${fc.missing.length} fields still empty.`
        : "Core item details are filled in.";

  const completedHint =
    fc?.completed?.length && fc.completed.length <= 5
      ? `Provided: ${fc.completed.join(", ")}.`
      : fc?.pct != null
        ? `${fc.pct}% of tracked inputs complete.`
        : "";

  return [
    {
      label: "Input details",
      weightPct: CONFIDENCE_WEIGHTS.fieldCompleteness,
      score: fieldScore,
      detail: [completedHint, missingHint].filter(Boolean).join(" "),
    },
    {
      label: "Comparable quality",
      weightPct: CONFIDENCE_WEIGHTS.compQuality,
      score: compScore,
      detail:
        compScore >= 70
          ? "Several recent, well-described comps support the valuation band."
          : compScore >= 40
            ? "Some comps are present but thin or loosely matched to your item."
            : "Few or weak comps; treat the band as directional until you refine details.",
    },
    {
      label: "Market stability",
      weightPct: CONFIDENCE_WEIGHTS.marketStability,
      score: stabilityScore,
      detail:
        stabilityScore >= 70
          ? "Comp prices cluster tightly; less swing between low and high evidence."
          : stabilityScore >= 40
            ? "Moderate spread across comp prices or market signals."
            : "Wide spread or volatile signals; the range may move with new sales.",
    },
  ];
}

function confidenceFormulaPlain(score: number | null, lines: ConfidenceBreakdownLine[]): string {
  if (score == null) return "Confidence breakdown unavailable for this snapshot.";
  const parts = lines.map((l) => `${l.weightPct}% ${l.label.toLowerCase()} (${l.score}/100)`);
  return `Overall confidence ${score}/100 = ${parts.join(" + ")}.`;
}

export function buildMonitorValueAlertContent(args: {
  title: string;
  assetTypeName: string;
  currency: string;
  baselineMid: number;
  adjustedMid: number;
  analytics?: PortfolioAnalytics | null;
  citationUrls?: string[];
  comparableCount?: number;
}): MonitorValueAlertContent {
  const uplift =
    args.baselineMid > 0 ? (args.adjustedMid - args.baselineMid) / args.baselineMid : 0;
  const upliftPct = Math.round(uplift * 100);
  const analytics = args.analytics;
  const confidenceScore = analytics?.confidenceScore ?? null;
  const breakdownLines = analytics ? breakdownLinesFromAnalytics(analytics) : [];
  const citationUrls = (args.citationUrls ?? []).filter(Boolean).slice(0, 5);

  const fromStr = formatMoneyPlain(args.baselineMid, args.currency);
  const toStr = formatMoneyPlain(args.adjustedMid, args.currency);

  const summaryLine =
    confidenceScore != null
      ? `${args.title} is up about ${upliftPct}% since baseline (${fromStr} → ${toStr}). Confidence ${confidenceScore}/100.`
      : `${args.title} is up about ${upliftPct}% since baseline (${fromStr} → ${toStr}).`;

  const paragraphs: string[] = [
    `${args.title} (${args.assetTypeName}) is up about ${upliftPct}% versus the sales-only baseline (${fromStr} → ${toStr}).`,
  ];

  if (confidenceScore != null && breakdownLines.length) {
    paragraphs.push(confidenceFormulaPlain(confidenceScore, breakdownLines));
    paragraphs.push("Breakdown:");
    for (const line of breakdownLines) {
      paragraphs.push(
        `• ${line.label} (${line.weightPct}% weight): ${line.score}/100. ${line.detail}`,
      );
    }
  } else {
    paragraphs.push(
      "Confidence breakdown is unavailable on this snapshot. Open the report to review comparables and inputs.",
    );
  }

  if (args.comparableCount != null && args.comparableCount > 0) {
    paragraphs.push(`${args.comparableCount} comparable row(s) on the saved valuation.`);
  }

  if (citationUrls.length) {
    paragraphs.push("Sources cited when this valuation was generated:");
    for (const url of citationUrls) {
      paragraphs.push(`• ${url}`);
    }
  } else {
    paragraphs.push(
      "No web research citations on this snapshot. Newer valuations may include source links when Tavily is enabled.",
    );
  }

  paragraphs.push("Open the full report for comparables, market narrative, and any research sources.");

  return {
    summaryLine,
    bodyPlain: paragraphs.join("\n\n"),
    upliftPct,
    confidenceScore,
    breakdownLines,
    citationUrls,
  };
}

export function buildPortfolioHealthAlertBody(args: {
  kind: "revalue" | "receipt";
  title: string;
  analytics?: PortfolioAnalytics | null;
  adjustedMid?: number;
  currency?: string;
}): string {
  if (args.kind === "revalue") {
    const freshness = args.analytics?.valuationFreshness ?? "stale";
    const freshnessNote =
      freshness === "stale"
        ? "This valuation is past the freshness window for its asset class."
        : "Market context may have shifted since this run was saved.";
    return `${args.title}: ${freshnessNote} Re-run the wizard or refine details so comps and market signals reflect today.`;
  }

  const gap = args.analytics?.insuranceGap;
  const receipt = args.analytics?.receiptStatus ?? "missing";
  const value =
    args.adjustedMid != null && args.currency
      ? formatMoneyPlain(args.adjustedMid, args.currency)
      : null;
  const valueNote = value ? ` Current estimate ${value}.` : "";
  const receiptNote =
    receipt === "documented"
      ? "Provenance looks documented."
      : receipt === "partial"
        ? "Some purchase or provenance hints exist but documentation is incomplete."
        : "No receipt or provenance notes were captured.";
  const insureNote = gap
    ? " This holding may be under-documented for insurance at this value."
    : " Adding receipt or provenance details improves insurance and resale confidence.";
  return `${args.title}: ${receiptNote}${valueNote}${insureNote}`;
}
