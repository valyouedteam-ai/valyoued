import type {
  AssetType,
  Comparable,
  EstimateInput,
  MarketSignal,
  PortfolioAnalytics,
} from "@workspace/api-zod";

const RECEIPT_SIGNALS =
  /\b(receipt|invoice|proof\s+of\s+purchase|warranty|box\s+and\s+papers|full\s+set|certificate|provenance|authenticity\s+card)\b/i;

const HIGH_VALUE_THRESHOLD_GBP = 2000;

/** Asset-class half-life in days before a valuation is considered stale. */
const FRESHNESS_HALF_LIFE_DAYS: Record<string, number> = {
  smartphone: 90,
  laptop: 120,
  tablet: 120,
  electronics: 120,
  car: 180,
  "everyday-car": 180,
  "classic-car": 365,
  "luxury-watch": 365,
  "vintage-watch": 365,
  watch: 365,
  "designer-handbag": 270,
  sneakers: 120,
  "trading-cards": 90,
  "wine-spirits": 365,
  default: 180,
};

function fieldLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function computeFieldCompleteness(
  input: EstimateInput,
  assetType: AssetType,
): PortfolioAnalytics["fieldCompleteness"] {
  const completed: string[] = [];
  const missing: string[] = [];

  const check = (key: string, filled: boolean) => {
    const label = fieldLabel(key);
    if (filled) completed.push(label);
    else missing.push(label);
  };

  check("title", Boolean(input.title?.trim()));
  check("condition", typeof input.condition === "number" && input.condition > 0);
  check("currentRegion", Boolean(input.currentRegion?.trim()));
  check("brand", Boolean(input.brand?.trim()));
  check("model", Boolean(input.model?.trim()));
  check("year", typeof input.year === "number" && input.year > 0);
  check("purchasePrice", typeof input.purchasePrice === "number" && input.purchasePrice > 0);
  check("attributes", Boolean(input.attributes?.trim()));

  for (const f of assetType.fields ?? []) {
    if (["brand", "model", "year", "purchasePrice", "condition", "attributes"].includes(f.key)) continue;
    const extra = input.extraFields?.[f.key];
    const filled =
      (typeof extra === "string" && extra.trim().length > 0) ||
      (typeof extra === "number" && Number.isFinite(extra)) ||
      (typeof extra === "boolean" && extra);
    check(f.key, filled);
  }

  const total = completed.length + missing.length;
  const pct = total > 0 ? Math.round((completed.length / total) * 100) : 0;
  return { completed, missing, pct };
}

function computeReceiptStatus(input: EstimateInput): PortfolioAnalytics["receiptStatus"] {
  const blob = `${input.attributes ?? ""} ${JSON.stringify(input.extraFields ?? {})}`;
  const hasPurchase = typeof input.purchasePrice === "number" && input.purchasePrice > 0;
  if (RECEIPT_SIGNALS.test(blob) && hasPurchase) return "documented";
  if (RECEIPT_SIGNALS.test(blob) || hasPurchase) return "partial";
  return "missing";
}

function compQualityScore(comparables: Comparable[], createdAt: Date): number {
  if (comparables.length === 0) return 0.2;
  const currentYear = createdAt.getUTCFullYear();
  let score = Math.min(1, comparables.length / 6) * 0.5;
  const recent = comparables.filter((c) => typeof c.year === "number" && c.year >= currentYear - 2).length;
  score += (recent / Math.max(1, comparables.length)) * 0.3;
  const withRelevance = comparables.filter((c) => Boolean(c.relevanceExplanation?.trim())).length;
  score += (withRelevance / Math.max(1, comparables.length)) * 0.2;
  return Math.min(1, score);
}

function volatilityScore(comparables: Comparable[], marketSignals: MarketSignal[]): number {
  if (comparables.length >= 2) {
    const prices = comparables.map((c) => c.price).filter((p) => p > 0);
    if (prices.length >= 2) {
      const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
      const variance = prices.reduce((s, p) => s + (p - mean) ** 2, 0) / prices.length;
      const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
      return Math.max(0, Math.min(1, 1 - cv));
    }
  }
  if (marketSignals.length === 0) return 0.6;
  const avgImpact = marketSignals.reduce((s, m) => s + Math.abs((m.impact ?? 1) - 1), 0) / marketSignals.length;
  return Math.max(0, Math.min(1, 1 - avgImpact * 2));
}

function resalePotentialFrom(
  uplift: number,
  compScore: number,
  arbitrageSpread: number,
): PortfolioAnalytics["resalePotential"] {
  const composite = uplift * 0.4 + compScore * 0.35 + Math.min(1, arbitrageSpread) * 0.25;
  if (composite >= 0.55) return "strong";
  if (composite >= 0.35) return "moderate";
  return "low";
}

function actionRecommendationFrom(
  resale: PortfolioAnalytics["resalePotential"],
  receiptStatus: PortfolioAnalytics["receiptStatus"],
  adjustedMid: number,
  insuranceGap: boolean,
): PortfolioAnalytics["actionRecommendation"] {
  if (insuranceGap || (adjustedMid >= HIGH_VALUE_THRESHOLD_GBP && receiptStatus !== "documented")) {
    return "insure";
  }
  if (resale === "strong") return "sell";
  return "hold";
}

function valuationFreshnessFrom(assetTypeId: string, createdAt: Date): PortfolioAnalytics["valuationFreshness"] {
  const halfLife = FRESHNESS_HALF_LIFE_DAYS[assetTypeId] ?? FRESHNESS_HALF_LIFE_DAYS.default;
  const ageDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays <= halfLife * 0.5) return "fresh";
  if (ageDays <= halfLife) return "aging";
  return "stale";
}

export function computePortfolioAnalytics(args: {
  input: EstimateInput;
  assetType: AssetType;
  comparables: Comparable[];
  marketSignals: MarketSignal[];
  baselineMid: number;
  adjustedMid: number;
  adjustedLow: number;
  adjustedHigh: number;
  arbitrageNetSpread?: number;
  createdAt: Date;
}): PortfolioAnalytics {
  const fieldCompleteness = computeFieldCompleteness(args.input, args.assetType);
  const receiptStatus = computeReceiptStatus(args.input);
  const compScore = compQualityScore(args.comparables, args.createdAt);
  const volScore = volatilityScore(args.comparables, args.marketSignals);
  const fieldScore = fieldCompleteness.pct / 100;

  const confidenceScore = Math.round(
    Math.min(100, Math.max(0, fieldScore * 40 + compScore * 35 + volScore * 25)),
  );

  const uplift =
    args.baselineMid > 0 ? Math.max(0, Math.min(1, (args.adjustedMid - args.baselineMid) / args.baselineMid + 0.5)) : 0.5;
  const spread =
    args.arbitrageNetSpread ??
    (args.adjustedHigh > args.adjustedLow && args.adjustedMid > 0
      ? (args.adjustedHigh - args.adjustedLow) / args.adjustedMid
      : 0);

  const resalePotential = resalePotentialFrom(uplift, compScore, spread);
  const insuranceGap =
    args.adjustedMid >= HIGH_VALUE_THRESHOLD_GBP &&
    receiptStatus !== "documented" &&
    fieldCompleteness.pct < 70;

  const actionRecommendation = actionRecommendationFrom(
    resalePotential,
    receiptStatus,
    args.adjustedMid,
    insuranceGap,
  );

  return {
    confidenceScore,
    fieldCompleteness,
    resalePotential,
    actionRecommendation,
    valuationFreshness: valuationFreshnessFrom(args.assetType.id, args.createdAt),
    receiptStatus,
    insuranceGap: insuranceGap || undefined,
    confidenceBreakdown: {
      fieldCompleteness: Math.round(fieldScore * 100),
      compQuality: Math.round(compScore * 100),
      marketStability: Math.round(volScore * 100),
    },
  };
}

export function readPortfolioAnalyticsFromStored(storedUnknown: unknown): PortfolioAnalytics | undefined {
  const raw =
    storedUnknown && typeof storedUnknown === "object" ? (storedUnknown as Record<string, unknown>) : null;
  if (!raw?.portfolioAnalytics || typeof raw.portfolioAnalytics !== "object") return undefined;
  return raw.portfolioAnalytics as PortfolioAnalytics;
}

export function summaryFieldsFromStored(storedUnknown: unknown, row: {
  baselineMid: number;
  adjustedMid: number;
  assetTypeId: string;
  createdAt: Date;
}): {
  adjustedLow?: number;
  adjustedHigh?: number;
  confidenceScore?: number;
  resalePotential?: PortfolioAnalytics["resalePotential"];
  actionRecommendation?: PortfolioAnalytics["actionRecommendation"];
  valuationFreshness?: PortfolioAnalytics["valuationFreshness"];
  receiptStatus?: PortfolioAnalytics["receiptStatus"];
  insuranceGap?: boolean;
} {
  const raw =
    storedUnknown && typeof storedUnknown === "object" ? (storedUnknown as Record<string, unknown>) : {};
  let analytics = readPortfolioAnalyticsFromStored(storedUnknown);
  if (!analytics && raw.input && raw.assetType) {
    analytics = computePortfolioAnalytics({
      input: raw.input as EstimateInput,
      assetType: raw.assetType as AssetType,
      comparables: Array.isArray(raw.comparables) ? (raw.comparables as Comparable[]) : [],
      marketSignals: Array.isArray(raw.marketSignals) ? (raw.marketSignals as MarketSignal[]) : [],
      baselineMid: typeof raw.baselineMid === "number" ? raw.baselineMid : row.baselineMid,
      adjustedMid: typeof raw.adjustedMid === "number" ? raw.adjustedMid : row.adjustedMid,
      adjustedLow: typeof raw.adjustedLow === "number" ? raw.adjustedLow : row.adjustedMid,
      adjustedHigh: typeof raw.adjustedHigh === "number" ? raw.adjustedHigh : row.adjustedMid,
      createdAt: row.createdAt,
    });
  }
  return {
    adjustedLow: typeof raw.adjustedLow === "number" ? raw.adjustedLow : undefined,
    adjustedHigh: typeof raw.adjustedHigh === "number" ? raw.adjustedHigh : undefined,
    confidenceScore: analytics?.confidenceScore,
    resalePotential: analytics?.resalePotential,
    actionRecommendation: analytics?.actionRecommendation,
    valuationFreshness: analytics?.valuationFreshness,
    receiptStatus: analytics?.receiptStatus,
    insuranceGap: analytics?.insuranceGap,
  };
}
