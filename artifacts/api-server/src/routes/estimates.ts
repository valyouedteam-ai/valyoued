import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, estimatesTable, type Estimate } from "@workspace/db";
import {
  CreateEstimateBody,
  CreateEstimateQueryParams,
  CreateEstimateResponse,
  GetEstimateParams,
  GetEstimateResponse,
  GetEstimateStatsResponse,
  ListAssetTypesResponse,
  ListEstimatesResponse,
  ListRegionsResponse,
} from "@workspace/api-zod";
import type { AssetType, EstimateInput, EstimateReport, EstimateResult } from "@workspace/api-zod";
import { ASSET_TYPES, getAssetType } from "../lib/assetTypes";
import { REGIONS, getRegion } from "../lib/regions";
import { generateEstimate } from "../lib/estimate";
import { requireAuth, getUserId, type AuthedRequest } from "../middlewares/requireAuth";
import { recordPlatformEvent } from "../lib/platformEvents";

const router: IRouter = Router();

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
      "This dossier was recovered from older data; some narrative sections may be missing.",
    baselineNarrative: partial.baselineNarrative ?? "",
    marketNarrative: partial.marketNarrative ?? "",
    arbitrageNarrative: partial.arbitrageNarrative ?? "",
    worldEventsNarrative: partial.worldEventsNarrative ?? "",
    finalNarrative: partial.finalNarrative ?? "",
  };
}

function mergeEstimateResultFromRow(row: Estimate, storedUnknown: unknown): EstimateResult {
  const raw =
    storedUnknown && typeof storedUnknown === "object"
      ? (storedUnknown as Record<string, unknown>)
      : {};
  const baselineMid = finiteNum(raw.baselineMid, row.baselineMid);
  const adjustedMid = finiteNum(raw.adjustedMid, row.adjustedMid);
  const tier: "free" | "pro" =
    raw.tier === "pro" || raw.tier === "free" ? raw.tier : (row.tier as "free" | "pro");

  return {
    ...raw,
    input: resolveEstimateInput(row, raw.input),
    assetType: resolveEstimateAssetType(row, raw.assetType),
    report: resolveEstimateReport(raw.report, row.title),
    marketSignals: safeArray(raw.marketSignals),
    worldEvents: safeArray(raw.worldEvents),
    arbitrage: safeArray(raw.arbitrage),
    comparables: safeArray(raw.comparables),
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
    createdAt: row.createdAt.toISOString(),
  } as unknown as EstimateResult;
}

router.get("/asset-types", async (_req, res): Promise<void> => {
  res.json(ListAssetTypesResponse.parse(ASSET_TYPES));
});

router.get("/regions", async (_req, res): Promise<void> => {
  res.json(ListRegionsResponse.parse(REGIONS));
});

router.get("/estimates", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.json(ListEstimatesResponse.parse([]));
    return;
  }
  const rows = await db
    .select()
    .from(estimatesTable)
    .where(eq(estimatesTable.userId, userId))
    .orderBy(desc(estimatesTable.createdAt))
    .limit(50);
  const summaries = rows.map((r) => ({
    id: r.id,
    title: r.title,
    assetTypeName: r.assetTypeName,
    baselineMid: r.baselineMid,
    adjustedMid: r.adjustedMid,
    currency: r.currency,
    bestArbitrageRegion: r.bestArbitrageRegion,
    createdAt: r.createdAt.toISOString(),
  }));
  res.json(ListEstimatesResponse.parse(summaries));
});

router.get("/estimates/stats", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const rows = userId
    ? await db.select().from(estimatesTable).where(eq(estimatesTable.userId, userId))
    : [];
  const count = rows.length;
  const averageBaselineUsd = count ? rows.reduce((s, r) => s + r.baselineMid, 0) / count : 0;
  const averageAdjustedUsd = count ? rows.reduce((s, r) => s + r.adjustedMid, 0) / count : 0;
  const averageUplift = count
    ? rows.reduce(
        (s, r) => s + (r.baselineMid > 0 ? r.adjustedMid / r.baselineMid - 1 : 0),
        0,
      ) / count
    : 0;

  const byTypeMap = new Map<string, { count: number; total: number }>();
  for (const r of rows) {
    const cur = byTypeMap.get(r.assetTypeName) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += r.adjustedMid;
    byTypeMap.set(r.assetTypeName, cur);
  }
  const byAssetType = Array.from(byTypeMap.entries()).map(([assetTypeName, v]) => ({
    assetTypeName,
    count: v.count,
    averageAdjustedUsd: v.total / v.count,
  }));

  const regionMap = new Map<string, number>();
  for (const r of rows) {
    regionMap.set(r.bestArbitrageRegion, (regionMap.get(r.bestArbitrageRegion) ?? 0) + 1);
  }
  const topArbitrageRegions = Array.from(regionMap.entries())
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  res.json(
    GetEstimateStatsResponse.parse({
      count,
      averageBaselineUsd,
      averageAdjustedUsd,
      averageUplift,
      byAssetType,
      topArbitrageRegions,
    }),
  );
});

router.post("/estimates", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).userId!;
  const body = CreateEstimateBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const query = CreateEstimateQueryParams.safeParse(req.query);
  const tier: "free" | "pro" = query.success && query.data.pro ? "pro" : "free";

  const assetType = getAssetType(body.data.assetTypeId);
  if (!assetType) {
    res.status(400).json({ error: "Unknown assetTypeId" });
    return;
  }

  const region = getRegion(body.data.currentRegion);
  const input = {
    ...body.data,
    currency: region?.currencyCode ?? body.data.currency ?? "USD",
  };

  const computed = await generateEstimate(input, assetType, tier);

  const [row] = await db
    .insert(estimatesTable)
    .values({
      userId,
      assetTypeId: assetType.id,
      assetTypeName: assetType.name,
      title: input.title,
      currency: computed.currency,
      baselineMid: computed.baselineMid,
      adjustedMid: computed.adjustedMid,
      bestArbitrageRegion: computed.bestArbitrageRegion,
      tier,
      result: computed,
    })
    .returning();

  const result = {
    ...computed,
    id: row.id,
    createdAt: row.createdAt.toISOString(),
  } as unknown as EstimateResult;
  void recordPlatformEvent({
    userId,
    eventType: "estimate.created",
    payload: {
      estimateId: row.id,
      assetTypeId: assetType.id,
      tier,
      adjustedMid: computed.adjustedMid,
      baselineMid: computed.baselineMid,
      currency: computed.currency,
      region: input.currentRegion,
    },
  });
  res.json(CreateEstimateResponse.parse(result));
});

router.get("/estimates/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetEstimateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const userId = (req as AuthedRequest).userId!;
  const [row] = await db
    .select()
    .from(estimatesTable)
    .where(and(eq(estimatesTable.id, params.data.id), eq(estimatesTable.userId, userId)));
  if (!row) {
    res.status(404).json({ error: "Estimate not found" });
    return;
  }
  const merged = mergeEstimateResultFromRow(row, row.result);
  res.json(GetEstimateResponse.parse(merged));
});

export default router;
