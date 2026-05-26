import type { AssetType, EstimateInput, EstimateReport, EstimateResult } from "@workspace/api-zod";
import type { Estimate } from "@workspace/db";
import { getAssetType } from "./assetTypes";
import { sanitizeComparables } from "./comparables";

function isCompleteAssetType(v: unknown): v is AssetType {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    typeof o.category === "string" &&
    typeof o.tagline === "string" &&
    Array.isArray(o.fields) &&
    typeof o.exampleAttributes === "string" &&
    typeof o.internationallyTradeable === "boolean"
  );
}

function resolveEstimateAssetType(
  row: { assetTypeId: string; assetTypeName: string },
  embedded: unknown,
): AssetType {
  if (isCompleteAssetType(embedded)) return embedded;
  const fromRegistry = getAssetType(row.assetTypeId);
  if (fromRegistry) return fromRegistry;
  return {
    id: row.assetTypeId,
    name: row.assetTypeName,
    category: "Other",
    tagline: "",
    fields: [],
    exampleAttributes: "",
    internationallyTradeable: true,
  };
}

function isCompleteEstimateInput(v: unknown): v is EstimateInput {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.assetTypeId === "string" &&
    typeof o.title === "string" &&
    typeof o.currentRegion === "string" &&
    typeof o.currency === "string" &&
    typeof o.condition === "number"
  );
}

function resolveEstimateInput(
  row: {
    assetTypeId: string;
    title: string;
    currency: string;
    bestArbitrageRegion: string;
  },
  embedded: unknown,
): EstimateInput {
  if (isCompleteEstimateInput(embedded)) return embedded;
  const partial =
    embedded && typeof embedded === "object" ? (embedded as Partial<EstimateInput>) : {};
  return {
    assetTypeId: partial.assetTypeId ?? row.assetTypeId,
    title: partial.title ?? row.title,
    currentRegion: partial.currentRegion ?? row.bestArbitrageRegion,
    currency: partial.currency ?? row.currency,
    condition: typeof partial.condition === "number" ? partial.condition : 5,
    brand: partial.brand,
    model: partial.model,
    year: partial.year,
    purchasePrice: partial.purchasePrice,
    attributes: partial.attributes,
    extraFields: partial.extraFields,
  };
}

function finiteNum(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function safeArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function isCompleteEstimateReport(v: unknown): v is EstimateReport {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.headline === "string" &&
    typeof o.summary === "string" &&
    typeof o.baselineNarrative === "string" &&
    typeof o.marketNarrative === "string" &&
    typeof o.arbitrageNarrative === "string" &&
    typeof o.worldEventsNarrative === "string" &&
    typeof o.finalNarrative === "string"
  );
}

function resolveEstimateReport(embedded: unknown, title: string): EstimateReport {
  if (isCompleteEstimateReport(embedded)) return embedded;
  const partial =
    embedded && typeof embedded === "object" ? (embedded as Partial<EstimateReport>) : {};
  return {
    headline: partial.headline ?? `Valuation · ${title}`,
    summary:
      partial.summary ??
      "This valuation was recovered from older data; some narrative sections may be missing.",
    baselineNarrative: partial.baselineNarrative ?? "",
    marketNarrative: partial.marketNarrative ?? "",
    arbitrageNarrative: partial.arbitrageNarrative ?? "",
    worldEventsNarrative: partial.worldEventsNarrative ?? "",
    finalNarrative: partial.finalNarrative ?? "",
  };
}

export function mergeEstimateResultFromRow(row: Estimate, storedUnknown: unknown): EstimateResult {
  const raw =
    storedUnknown && typeof storedUnknown === "object"
      ? (storedUnknown as Record<string, unknown>)
      : {};
  const baselineMid = finiteNum(raw.baselineMid, row.baselineMid);
  const adjustedMid = finiteNum(raw.adjustedMid, row.adjustedMid);
  const tier: "free" | "pro" =
    raw.tier === "pro" || raw.tier === "free" ? raw.tier : (row.tier as "free" | "pro");

  const lineageObj = row.lineage && typeof row.lineage === "object" ? row.lineage : {};
  const valuationLineage =
    lineageObj && Object.keys(lineageObj as object).length > 0
      ? { ...(lineageObj as NonNullable<EstimateResult["valuationLineage"]>) }
      : undefined;

  let valuationOutcome: EstimateResult["valuationOutcome"];
  if (
    row.outcomeSoldPrice != null &&
    Number.isFinite(row.outcomeSoldPrice) &&
    row.outcomeRecordedAt
  ) {
    valuationOutcome = {
      soldPrice: row.outcomeSoldPrice,
      recordedAt: row.outcomeRecordedAt,
      ...(row.outcomeCurrency && row.outcomeCurrency.trim() !== ""
        ? { currency: row.outcomeCurrency }
        : {}),
    };
  }

  let valuationFeedback: EstimateResult["valuationFeedback"];
  if (
    row.feedbackHelpful !== null &&
    row.feedbackHelpful !== undefined &&
    row.feedbackRecordedAt
  ) {
    valuationFeedback = {
      helpful: row.feedbackHelpful,
      recordedAt: row.feedbackRecordedAt,
    };
  }

  return {
    ...raw,
    input: resolveEstimateInput(row, raw.input),
    assetType: resolveEstimateAssetType(row, raw.assetType),
    report: resolveEstimateReport(raw.report, row.title),
    marketSignals: safeArray(raw.marketSignals),
    worldEvents: safeArray(raw.worldEvents),
    arbitrage: safeArray(raw.arbitrage),
    comparables: sanitizeComparables(safeArray(raw.comparables)),
    netMarketFactor: finiteNum(raw.netMarketFactor, 1),
    currency: typeof raw.currency === "string" && raw.currency ? raw.currency : row.currency,
    tier,
    baselineLow: finiteNum(raw.baselineLow, baselineMid),
    baselineMid,
    baselineHigh: finiteNum(raw.baselineHigh, baselineMid),
    adjustedLow: finiteNum(raw.adjustedLow, adjustedMid),
    adjustedMid,
    adjustedHigh: finiteNum(raw.adjustedHigh, adjustedMid),
    bestArbitrageRegion:
      typeof raw.bestArbitrageRegion === "string" && raw.bestArbitrageRegion
        ? raw.bestArbitrageRegion
        : row.bestArbitrageRegion,
    id: row.id,
    createdAt: row.createdAt,
    intent:
      row.intent === "hold" || row.intent === "monitor" || row.intent === "sell"
        ? (row.intent as NonNullable<EstimateResult["intent"]>)
        : null,
    valuationLineage,
    valuationOutcome,
    valuationFeedback,
  } as unknown as EstimateResult;
}
