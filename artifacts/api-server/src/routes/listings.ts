import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, estimatesTable, listingsTable } from "@workspace/db";
import { requireAuth, getUserId, type AuthedRequest } from "../middlewares/requireAuth";
import {
  GenerateListingDraftBody,
  GenerateListingDraftResponse,
  GetListingDraftResponse,
  ListListingDraftsResponse,
  GetListingDraftParams,
  DeleteListingDraftParams,
} from "@workspace/api-zod";
import type { EstimateResult } from "@workspace/api-zod";
import { generateListingDraft, type Platform, type PriceStrategy } from "../lib/listing";
import { logger } from "../lib/logger";
import { rateLimit } from "../lib/rateLimit";
import { recordPlatformEvent } from "../lib/platformEvents";

const router: IRouter = Router();

// Listing generation calls Anthropic. Cap at 12 per minute per IP.
const generateLimit = rateLimit({
  windowMs: 60_000,
  max: 12,
  message: "Too many listing generations in a row; please wait a minute and try again.",
});

router.get("/listings", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.json(ListListingDraftsResponse.parse([]));
    return;
  }
  const rows = await db
    .select()
    .from(listingsTable)
    .where(eq(listingsTable.userId, userId))
    .orderBy(desc(listingsTable.createdAt))
    .limit(100);
  const drafts = rows.map(rowToDraft);
  res.json(ListListingDraftsResponse.parse(drafts));
});

router.post("/listings", requireAuth, generateLimit, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).userId!;
  const body = GenerateListingDraftBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [estRow] = await db
    .select()
    .from(estimatesTable)
    .where(and(eq(estimatesTable.id, body.data.estimateId), eq(estimatesTable.userId, userId)));
  if (!estRow) {
    res.status(404).json({ error: "Estimate not found" });
    return;
  }

  const stored = estRow.result as Omit<EstimateResult, "id" | "createdAt">;
  const estimate = {
    ...stored,
    id: estRow.id,
    createdAt: estRow.createdAt.toISOString(),
  } as unknown as EstimateResult;

  try {
    const generated = await generateListingDraft({
      estimate,
      platform: body.data.platform as Platform,
      priceStrategy: (body.data.priceStrategy ?? "market") as PriceStrategy,
    });

    const [row] = await db
      .insert(listingsTable)
      .values({
        userId,
        estimateId: estRow.id,
        platform: body.data.platform,
        assetTitle: estRow.title,
        assetTypeName: estRow.assetTypeName,
        draftTitle: generated.draftTitle,
        draftBody: generated.draftBody,
        suggestedPrice: generated.suggestedPrice,
        currency: estRow.currency,
        photoTips: generated.photoTips,
        hashtags: generated.hashtags,
        proTips: generated.proTips,
      })
      .returning();

    void recordPlatformEvent({
      userId,
      eventType: "listing.created",
      payload: {
        listingId: row.id,
        estimateId: row.estimateId,
        platform: body.data.platform,
        suggestedPrice: row.suggestedPrice,
        currency: row.currency,
      },
    });

    res.json(GenerateListingDraftResponse.parse(rowToDraft(row)));
  } catch (err) {
    logger.error({ err }, "Listing generation error");
    res.status(502).json({
      error: "Could not generate the listing. Please try again in a moment.",
    });
  }
});

router.get("/listings/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).userId!;
  const params = GetListingDraftParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select()
    .from(listingsTable)
    .where(and(eq(listingsTable.id, params.data.id), eq(listingsTable.userId, userId)));
  if (!row) {
    res.status(404).json({ error: "Listing draft not found" });
    return;
  }
  res.json(GetListingDraftResponse.parse(rowToDraft(row)));
});

router.delete("/listings/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).userId!;
  const params = DeleteListingDraftParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db
    .delete(listingsTable)
    .where(and(eq(listingsTable.id, params.data.id), eq(listingsTable.userId, userId)));
  res.json({ ok: true });
});

function rowToDraft(row: typeof listingsTable.$inferSelect) {
  return {
    id: row.id,
    estimateId: row.estimateId,
    platform: row.platform,
    assetTitle: row.assetTitle,
    assetTypeName: row.assetTypeName,
    draftTitle: row.draftTitle,
    draftBody: row.draftBody,
    suggestedPrice: row.suggestedPrice,
    currency: row.currency,
    photoTips: row.photoTips,
    hashtags: row.hashtags,
    proTips: row.proTips,
    createdAt: row.createdAt.toISOString(),
  };
}

export default router;
