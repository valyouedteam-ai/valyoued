import type { EstimateInput, TraderAnalytics } from "@workspace/api-zod";

export function computeTraderAnalytics(args: {
  input: EstimateInput;
  adjustedMid: number;
  adjustedLow: number;
  adjustedHigh: number;
  baselineMid: number;
}): TraderAnalytics {
  const costBasis = typeof args.input.purchasePrice === "number" ? args.input.purchasePrice : undefined;
  const expectedResale = args.adjustedMid;
  const expectedMargin =
    costBasis != null && costBasis > 0 ? Math.round(((expectedResale - costBasis) / costBasis) * 1000) / 10 : undefined;

  const midVsLow = args.adjustedMid > 0 ? (args.adjustedMid - args.adjustedLow) / args.adjustedMid : 0;
  let dealScore: TraderAnalytics["dealScore"] = "fair";

  if (costBasis != null && costBasis > 0) {
    const marginPct = (expectedResale - costBasis) / costBasis;
    if (marginPct >= 0.25) dealScore = "strong_buy";
    else if (marginPct >= 0.12) dealScore = "good_margin";
    else if (marginPct >= 0.03) dealScore = "fair";
    else if (marginPct >= -0.05) dealScore = "risky";
    else if (marginPct >= -0.15) dealScore = "overpriced";
    else dealScore = "avoid";
  } else if (midVsLow > 0.15) {
    dealScore = "good_margin";
  } else if (args.adjustedMid < args.baselineMid * 0.92) {
    dealScore = "overpriced";
  }

  const targetMargin = 0.12;
  const maxBuyPrice =
    costBasis != null
      ? Math.round(expectedResale / (1 + targetMargin))
      : Math.round(args.adjustedLow * 0.98);

  return {
    dealScore,
    maxBuyPrice,
    expectedResale,
    expectedMargin,
    costBasis,
  };
}

export function readTraderAnalyticsFromStored(storedUnknown: unknown): TraderAnalytics | undefined {
  const raw =
    storedUnknown && typeof storedUnknown === "object" ? (storedUnknown as Record<string, unknown>) : null;
  if (!raw?.traderAnalytics || typeof raw.traderAnalytics !== "object") return undefined;
  return raw.traderAnalytics as TraderAnalytics;
}
