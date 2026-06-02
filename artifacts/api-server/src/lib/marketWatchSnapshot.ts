import type { MarketWatchSnapshot } from "@workspace/api-zod";

/** Broad asset-class anchor for v1 snapshot math (not brand-specific market data). */
function anchorForAssetClass(assetClass: string): number {
  const key = assetClass.toLowerCase();
  if (key.includes("car")) return 24_000;
  if (key.includes("electronic")) return 900;
  if (key.includes("watch")) return 6_500;
  return 4_500;
}

/** Stable variation from watch facets so different models do not share one price. */
function deterministicBasePrice(args: {
  assetClass: string;
  brand?: string;
  model?: string;
  yearFrom?: number;
  yearTo?: number;
}): number {
  const anchor = anchorForAssetClass(args.assetClass);
  const seed = [args.assetClass, args.brand, args.model, args.yearFrom, args.yearTo]
    .filter((v) => v != null && String(v).trim() !== "")
    .join("|");
  if (!seed) return anchor;

  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const spread = 0.35;
  const factor = 1 + ((hash % 1000) / 1000 - 0.5) * 2 * spread;
  return Math.round(anchor * factor);
}

/** Derive a Market Watch analytics snapshot from label facets (v1: ValYoued analytics, not live feeds). */
export function buildMarketWatchSnapshot(args: {
  assetClass: string;
  brand?: string;
  model?: string;
  yearFrom?: number;
  yearTo?: number;
  basePrice?: number;
}): MarketWatchSnapshot {
  const base = args.basePrice ?? deterministicBasePrice(args);
  const now = new Date();
  const trendPoints = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - i), 1));
    const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const drift = 1 + (i - 2.5) * 0.012;
    return { month, medianPrice: Math.round(base * drift) };
  });

  const label = [args.brand, args.model].filter(Boolean).join(" ") || args.assetClass;

  return {
    trendPoints,
    recentSales: [
      {
        price: Math.round(base * 0.98),
        soldAt: new Date(now.getTime() - 12 * 86400000).toISOString().slice(0, 10),
        platform: "eBay",
        condition: "Very good",
        daysToSell: 14,
        detail: `${label} · full disclosure`,
      },
      {
        price: Math.round(base * 1.04),
        soldAt: new Date(now.getTime() - 28 * 86400000).toISOString().slice(0, 10),
        platform: "Vinted",
        condition: "Good",
        daysToSell: 21,
        detail: `${label} · minor wear noted`,
      },
    ],
    demandMovement: base > 9000 ? "stable" : "rising",
    avgDaysToSell: 18,
    bestPlatform: args.assetClass.toLowerCase().includes("car") ? "AutoTrader" : "eBay",
    suggestedListingPrice: Math.round(base * 1.02),
    buyBelowPrice: Math.round(base * 0.88),
    expectedMarginPct: 12,
    analyticsNote:
      "Illustrative ValYoued snapshot from asset class and model facets. Not live marketplace pricing or brand-specific comps.",
  };
}
