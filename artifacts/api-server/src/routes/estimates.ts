import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, estimatesTable } from "@workspace/db";
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
import type { EstimateResult } from "@workspace/api-zod";
import { ASSET_TYPES, getAssetType } from "../lib/assetTypes";
import { REGIONS, getRegion } from "../lib/regions";
import { generateEstimate } from "../lib/estimate";
import { requireAuth, getUserId, type AuthedRequest } from "../middlewares/requireAuth";
import { recordPlatformEvent } from "../lib/platformEvents";

const router: IRouter = Router();

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
  const stored = row.result as Omit<EstimateResult, "id" | "createdAt">;
  const result = {
    ...stored,
    id: row.id,
    createdAt: row.createdAt.toISOString(),
  } as unknown as EstimateResult;
  res.json(GetEstimateResponse.parse(result));
});

export default router;
