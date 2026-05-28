import type { PortfolioHealth } from "@workspace/api-zod";
import { GetEstimateStatsResponse } from "@workspace/api-zod";
import { convertToUsdApprox } from "@workspace/fx-usd";
import { summaryFieldsFromStored } from "./portfolioAnalytics";

/** Minimal row shape for desk + home stats rollups. */
export type StatsRollupRow = {
  baselineMid: number;
  adjustedMid: number;
  currency: string;
  assetTypeName: string;
  bestArbitrageRegion: string | null;
  assetTypeId?: string;
  createdAt?: Date;
  result?: unknown;
};

const RESALE_SCORE: Record<string, number> = { low: 0.33, moderate: 0.66, strong: 1 };

export function computePortfolioHealthFromRows(
  rows: StatsRollupRow[],
  mult: Record<string, number>,
): PortfolioHealth {
  const totalPortfolioUsd = rows.reduce(
    (s, r) => s + convertToUsdApprox(r.adjustedMid, r.currency, mult),
    0,
  );
  const totalBaselineUsd = rows.reduce(
    (s, r) => s + convertToUsdApprox(r.baselineMid, r.currency, mult),
    0,
  );
  const valueGrowthPct = totalBaselineUsd > 0 ? (totalPortfolioUsd - totalBaselineUsd) / totalBaselineUsd : 0;

  const byTypeUsd = new Map<string, number>();
  let resaleSum = 0;
  let underinsuredCount = 0;
  let missingReceiptsCount = 0;
  let needsRevaluationCount = 0;

  for (const r of rows) {
    const usd = convertToUsdApprox(r.adjustedMid, r.currency, mult);
    byTypeUsd.set(r.assetTypeName, (byTypeUsd.get(r.assetTypeName) ?? 0) + usd);

    const summary = summaryFieldsFromStored(r.result, {
      baselineMid: r.baselineMid,
      adjustedMid: r.adjustedMid,
      assetTypeId: r.assetTypeId ?? "",
      createdAt: r.createdAt ?? new Date(),
    });
    if (summary.resalePotential) resaleSum += RESALE_SCORE[summary.resalePotential] ?? 0.5;
    if (summary.insuranceGap) underinsuredCount += 1;
    if (summary.receiptStatus === "missing") missingReceiptsCount += 1;
    if (summary.valuationFreshness === "stale") needsRevaluationCount += 1;
  }

  const typeShares = Array.from(byTypeUsd.values()).map((v) =>
    totalPortfolioUsd > 0 ? v / totalPortfolioUsd : 0,
  );
  let diversificationScore = 0;
  if (typeShares.length > 1) {
    const hhi = typeShares.reduce((s, p) => s + p * p, 0);
    diversificationScore = Math.round(((1 - hhi) / (1 - 1 / typeShares.length)) * 100);
  }

  return {
    totalPortfolioUsd,
    valueGrowthPct,
    resaleStrengthIndex: rows.length ? Math.round((resaleSum / rows.length) * 100) : 0,
    diversificationScore,
    underinsuredCount,
    missingReceiptsCount,
    needsRevaluationCount,
  };
}

export function computeEstimateStatsFromRows(
  rows: StatsRollupRow[],
  mult: Record<string, number>,
): ReturnType<typeof GetEstimateStatsResponse.parse> {
  const count = rows.length;
  const averageBaselineUsd = count
    ? rows.reduce((s, r) => s + convertToUsdApprox(r.baselineMid, r.currency, mult), 0) / count
    : 0;
  const averageAdjustedUsd = count
    ? rows.reduce((s, r) => s + convertToUsdApprox(r.adjustedMid, r.currency, mult), 0) / count
    : 0;
  const averageUplift = count
    ? rows.reduce((s, r) => s + (r.baselineMid > 0 ? r.adjustedMid / r.baselineMid - 1 : 0), 0) / count
    : 0;

  const byTypeMap = new Map<string, { count: number; totalAdjustedUsd: number }>();
  for (const r of rows) {
    const cur = byTypeMap.get(r.assetTypeName) ?? { count: 0, totalAdjustedUsd: 0 };
    cur.count += 1;
    cur.totalAdjustedUsd += convertToUsdApprox(r.adjustedMid, r.currency, mult);
    byTypeMap.set(r.assetTypeName, cur);
  }
  const byAssetType = Array.from(byTypeMap.entries()).map(([assetTypeName, v]) => ({
    assetTypeName,
    count: v.count,
    averageAdjustedUsd: v.totalAdjustedUsd / v.count,
  }));

  const regionMap = new Map<string, number>();
  for (const r of rows) {
    const reg = r.bestArbitrageRegion?.trim();
    if (!reg) continue;
    regionMap.set(reg, (regionMap.get(reg) ?? 0) + 1);
  }
  const topArbitrageRegions = Array.from(regionMap.entries())
    .map(([region, countInner]) => ({ region, count: countInner }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const portfolioHealth = computePortfolioHealthFromRows(rows, mult);

  return GetEstimateStatsResponse.parse({
    count,
    averageBaselineUsd,
    averageAdjustedUsd,
    averageUplift,
    byAssetType,
    topArbitrageRegions,
    portfolioHealth,
  });
}
