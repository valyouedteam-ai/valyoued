import { GetEstimateStatsResponse } from "@workspace/api-zod";
import { convertToUsdApprox } from "@workspace/fx-usd";

/** Minimal row shape for desk + home stats rollups. */
export type StatsRollupRow = {
  baselineMid: number;
  adjustedMid: number;
  currency: string;
  assetTypeName: string;
  bestArbitrageRegion: string | null;
};

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

  return GetEstimateStatsResponse.parse({
    count,
    averageBaselineUsd,
    averageAdjustedUsd,
    averageUplift,
    byAssetType,
    topArbitrageRegions,
  });
}
