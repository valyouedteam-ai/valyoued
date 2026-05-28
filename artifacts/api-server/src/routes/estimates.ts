import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, estimatesTable, type Estimate } from "@workspace/db";
import type { EstimateInput } from "@workspace/api-zod";
import {
  PatchEstimateBody,
  PatchEstimateParams,
  CreateEstimateBody,
  CreateEstimateResponse,
  GetEstimateParams,
  GetEstimateResponse,
  GetEstimateStatsResponse,
  ListAssetTypesResponse,
  ListEstimatesResponse,
  ListRegionsResponse,
  RefineEstimateBody,
} from "@workspace/api-zod";
import { ASSET_TYPES, getAssetType } from "../lib/assetTypes";
import { REGIONS, getRegion } from "../lib/regions";
import { generateEstimate } from "../lib/estimate";
import { requireAuth, getUserId, type AuthedRequest } from "../middlewares/requireAuth";
import { recordPlatformEvent } from "../lib/platformEvents";
import { getFxRateSnapshot } from "../lib/fxRates";
import { portfolioShelfFromEstimate, readAttributesFromStoredResult } from "@workspace/asset-shelf-tier";
import { logger } from "../lib/logger";
import { notifyEstimateReadyEmail } from "../lib/estimateReadyEmail";
import {
  FREE_MONTHLY_VALUATION_CAP,
  incrementMonthlyEstimateUsage,
  resolveUserEntitlements,
  valuationTierForEstimate,
  includeSellerPlaybookInEstimate,
} from "../lib/entitlements";
import { getPortfolioByIdForUser, resolveDefaultPortfolioId } from "../lib/portfoliosService";
import { computeEstimateStatsFromRows } from "../lib/estimateStatsRollup";
import { summaryFieldsFromStored } from "../lib/portfolioAnalytics";
import { mergeEstimateResultFromRow } from "../lib/estimateResultMerge";

const router: IRouter = Router();

function readSellerRegionFromStoredResult(storedUnknown: unknown, fallback: string): string {
  const raw =
    storedUnknown && typeof storedUnknown === "object" ? (storedUnknown as Record<string, unknown>) : {};
  const inp =
    raw.input && typeof raw.input === "object" ? (raw.input as Record<string, unknown>) : undefined;
  const cr = inp?.currentRegion;
  return typeof cr === "string" && cr.trim().length > 0 ? cr.trim() : fallback;
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
  const summaries = rows.map((r) => {
    const attrs = readAttributesFromStoredResult(r.result);
    const portfolioShelf = portfolioShelfFromEstimate(attrs, r.assetTypeId);
    const extra = summaryFieldsFromStored(r.result, {
      baselineMid: r.baselineMid,
      adjustedMid: r.adjustedMid,
      assetTypeId: r.assetTypeId,
      createdAt: r.createdAt,
    });
    return {
      id: r.id,
      title: r.title,
      assetTypeId: r.assetTypeId,
      assetTypeName: r.assetTypeName,
      baselineMid: r.baselineMid,
      adjustedMid: r.adjustedMid,
      currency: r.currency,
      bestArbitrageRegion: r.bestArbitrageRegion,
      tier: r.tier === "pro" ? "pro" : "free",
      currentRegion: readSellerRegionFromStoredResult(r.result, r.bestArbitrageRegion),
      portfolioShelf,
      createdAt: r.createdAt.toISOString(),
      portfolioId: r.portfolioId ?? null,
      intent: r.intent === "hold" || r.intent === "monitor" || r.intent === "sell" ? r.intent : null,
      ...extra,
    };
  });
  res.json(ListEstimatesResponse.parse(summaries));
});

router.get("/estimates/stats", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const rows = userId
    ? await db.select().from(estimatesTable).where(eq(estimatesTable.userId, userId))
    : [];
  const fx = await getFxRateSnapshot();
  const mult = fx.rates;
  const statsPayload = computeEstimateStatsFromRows(
    rows.map((r) => ({
      baselineMid: r.baselineMid,
      adjustedMid: r.adjustedMid,
      currency: r.currency,
      assetTypeName: r.assetTypeName,
      bestArbitrageRegion: r.bestArbitrageRegion,
      assetTypeId: r.assetTypeId,
      createdAt: r.createdAt,
      result: r.result,
    })),
    mult,
  );

  res.json(GetEstimateStatsResponse.parse(statsPayload));
});

router.post("/estimates", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).userId!;
  const ent = await resolveUserEntitlements(userId, req);

  const body = CreateEstimateBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const limit = ent.valuationsMonthLimit ?? null;
  if (limit != null && ent.valuationsThisMonth >= limit) {
    res.status(429).json({
      error: `You've used your ${FREE_MONTHLY_VALUATION_CAP} free valuations this month. Upgrade an Everyday subscription for unlimited personal valuations.`,
    });
    return;
  }

  const assetType = getAssetType(body.data.assetTypeId);
  if (!assetType) {
    res.status(400).json({ error: "Unknown assetTypeId" });
    return;
  }

  let portfolioIdToUse: string;
  const requestedPf = body.data.portfolioId;
  if (typeof requestedPf === "string" && requestedPf.trim() !== "") {
    const pfRow = await getPortfolioByIdForUser(requestedPf, userId);
    if (!pfRow) {
      res.status(400).json({ error: "portfolioId must reference one of your portfolios." });
      return;
    }
    portfolioIdToUse = pfRow.id;
  } else {
    portfolioIdToUse = await resolveDefaultPortfolioId(userId);
  }

  const region = getRegion(body.data.currentRegion);
  const tier = valuationTierForEstimate(ent);
  const includePlaybook = includeSellerPlaybookInEstimate(ent);

  const input: EstimateInput = {
    ...(body.data as EstimateInput),
    assetTypeId: assetType.id,
    currency: region?.currencyCode ?? body.data.currency ?? "USD",
    portfolioId: portfolioIdToUse,
  };

  const computed = await generateEstimate(input, assetType, tier, includePlaybook);

  const [row] = await db
    .insert(estimatesTable)
    .values({
      userId,
      portfolioId: portfolioIdToUse,
      assetTypeId: assetType.id,
      assetTypeName: assetType.name,
      title: input.title,
      currency: computed.estimate.currency,
      baselineMid: computed.estimate.baselineMid,
      adjustedMid: computed.estimate.adjustedMid,
      bestArbitrageRegion: computed.estimate.bestArbitrageRegion,
      tier,
      result: computed.estimate,
      lineage: computed.lineage,
    })
    .returning();

  await incrementMonthlyEstimateUsage(userId);

  const result = mergeEstimateResultFromRow(row, row.result);
  const parsedPayload = CreateEstimateResponse.safeParse(result);
  if (!parsedPayload.success) {
    logger.error(
      {
        estimateId: row.id,
        userId,
        zodIssues: parsedPayload.error.flatten(),
      },
      "CreateEstimateResponse validation failed after insert",
    );
    res.status(500).json({
      error:
        "We saved your valuation but the response payload failed validation. Our team sees this error in logs. Please reload your portfolio or try again.",
    });
    return;
  }

  void recordPlatformEvent({
    userId,
    eventType: "estimate.created",
    payload: {
      estimateId: row.id,
      assetTypeId: assetType.id,
      tier,
      adjustedMid: computed.estimate.adjustedMid,
      baselineMid: computed.estimate.baselineMid,
      currency: computed.estimate.currency,
      region: input.currentRegion,
    },
  });
  void notifyEstimateReadyEmail(userId, {
    id: row.id,
    title: input.title,
    assetTypeName: assetType.name,
  }).catch((err) => {
    logger.error({ err }, "notifyEstimateReadyEmail failed");
  });
  res.json(parsedPayload.data);
});

router.patch("/estimates/:id", requireAuth, async (req, res): Promise<void> => {
  const params = PatchEstimateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsedBody = PatchEstimateBody.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: parsedBody.error.message });
    return;
  }
  const patch = parsedBody.data;
  if (
    patch.intent === undefined &&
    patch.valuationOutcome === undefined &&
    patch.valuationFeedback === undefined
  ) {
    res.status(400).json({
      error: "Provide at least one of intent, valuationOutcome, or valuationFeedback.",
    });
    return;
  }

  const userId = (req as AuthedRequest).userId!;
  const now = new Date();
  const updates: Partial<Pick<Estimate, "intent" | "outcomeSoldPrice" | "outcomeCurrency" | "outcomeRecordedAt" | "feedbackHelpful" | "feedbackRecordedAt">> =
    {};
  if (patch.intent !== undefined) {
    updates.intent = patch.intent;
  }
  if (patch.valuationOutcome !== undefined) {
    updates.outcomeSoldPrice = patch.valuationOutcome.soldPrice;
    updates.outcomeCurrency =
      patch.valuationOutcome.currency?.trim() !== "" ? patch.valuationOutcome.currency!.trim() : null;
    updates.outcomeRecordedAt = now;
  }
  if (patch.valuationFeedback !== undefined) {
    updates.feedbackHelpful = patch.valuationFeedback.helpful;
    updates.feedbackRecordedAt = now;
  }

  const [updated] = await db
    .update(estimatesTable)
    .set(updates)
    .where(and(eq(estimatesTable.id, params.data.id), eq(estimatesTable.userId, userId)))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Estimate not found" });
    return;
  }
  const merged = mergeEstimateResultFromRow(updated, updated.result);
  res.json(GetEstimateResponse.parse(merged));
});

router.post("/estimates/:id/refine", requireAuth, async (req, res): Promise<void> => {
  const params = GetEstimateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsedBody = RefineEstimateBody.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: parsedBody.error.message });
    return;
  }

  const userId = (req as AuthedRequest).userId!;
  const ent = await resolveUserEntitlements(userId, req);
  if (!ent.canUsePortfolioAnalytics) {
    res.status(403).json({ error: "Refine valuations requires Everyday+ or Professional." });
    return;
  }

  const [row] = await db
    .select()
    .from(estimatesTable)
    .where(and(eq(estimatesTable.id, params.data.id), eq(estimatesTable.userId, userId)));
  if (!row) {
    res.status(404).json({ error: "Estimate not found" });
    return;
  }

  const merged = mergeEstimateResultFromRow(row, row.result);
  const input = {
    ...merged.input,
    ...(parsedBody.data.brand !== undefined ? { brand: parsedBody.data.brand } : {}),
    ...(parsedBody.data.model !== undefined ? { model: parsedBody.data.model } : {}),
    ...(parsedBody.data.year !== undefined ? { year: parsedBody.data.year } : {}),
    ...(parsedBody.data.purchasePrice !== undefined ? { purchasePrice: parsedBody.data.purchasePrice } : {}),
    ...(parsedBody.data.condition !== undefined ? { condition: parsedBody.data.condition } : {}),
    ...(parsedBody.data.attributes !== undefined ? { attributes: parsedBody.data.attributes } : {}),
    ...(parsedBody.data.extraFields !== undefined
      ? {
          extraFields: {
            ...merged.input.extraFields,
            ...(parsedBody.data.extraFields as Record<string, string>),
          },
        }
      : {}),
  } satisfies EstimateInput;

  const assetType = getAssetType(input.assetTypeId) ?? merged.assetType;
  const tier = valuationTierForEstimate(ent);
  const includePlaybook = includeSellerPlaybookInEstimate(ent);
  const computed = await generateEstimate(input, assetType, tier, includePlaybook);

  const [updated] = await db
    .update(estimatesTable)
    .set({
      title: input.title,
      currency: computed.estimate.currency,
      baselineMid: computed.estimate.baselineMid,
      adjustedMid: computed.estimate.adjustedMid,
      bestArbitrageRegion: computed.estimate.bestArbitrageRegion,
      tier,
      result: computed.estimate,
      lineage: computed.lineage,
    })
    .where(and(eq(estimatesTable.id, params.data.id), eq(estimatesTable.userId, userId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Estimate not found" });
    return;
  }

  const result = mergeEstimateResultFromRow(updated, updated.result);
  res.json(GetEstimateResponse.parse(result));
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
