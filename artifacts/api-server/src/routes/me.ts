import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, estimatesTable, listingsTable, billingSubscriptionsTable } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";
import { isAuthStubMode } from "../lib/authStub";
import { isStripeStubMode } from "../lib/stripeStub";

const router: IRouter = Router();

router.get("/me/billing", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).userId!;
  const stubTier = process.env.AUTH_STUB_BILLING_TIER?.trim();
  if (isAuthStubMode() && (stubTier === "pro" || stubTier === "free")) {
    res.json({
      tier: stubTier,
      status: stubTier === "pro" ? "stub_active" : "inactive",
      stripeCustomerId: null,
      stripeStub: isStripeStubMode(),
    });
    return;
  }

  const [sub] = await db
    .select()
    .from(billingSubscriptionsTable)
    .where(eq(billingSubscriptionsTable.userId, userId));
  res.json({
    tier: sub?.tier ?? "free",
    status: sub?.status ?? "inactive",
    stripeCustomerId: sub?.stripeCustomerId ?? null,
    stripeStub: isStripeStubMode(),
  });
});

/** GDPR-oriented bundle of the authenticated user's platform data (JSON). */
router.get("/me/data-export", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).userId!;

  const estimates = await db
    .select()
    .from(estimatesTable)
    .where(eq(estimatesTable.userId, userId))
    .orderBy(desc(estimatesTable.createdAt));

  const listings = await db
    .select()
    .from(listingsTable)
    .where(eq(listingsTable.userId, userId))
    .orderBy(desc(listingsTable.createdAt));

  res.json({
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
    userId,
    estimates: estimates.map((r) => ({
      id: r.id,
      assetTypeId: r.assetTypeId,
      assetTypeName: r.assetTypeName,
      title: r.title,
      currency: r.currency,
      baselineMid: r.baselineMid,
      adjustedMid: r.adjustedMid,
      bestArbitrageRegion: r.bestArbitrageRegion,
      tier: r.tier,
      result: r.result,
      createdAt: r.createdAt.toISOString(),
    })),
    listings: listings.map((r) => ({
      id: r.id,
      estimateId: r.estimateId,
      platform: r.platform,
      assetTitle: r.assetTitle,
      assetTypeName: r.assetTypeName,
      draftTitle: r.draftTitle,
      draftBody: r.draftBody,
      suggestedPrice: r.suggestedPrice,
      currency: r.currency,
      photoTips: r.photoTips,
      hashtags: r.hashtags,
      proTips: r.proTips,
      createdAt: r.createdAt.toISOString(),
    })),
    privacyNote:
      "This export contains valuation inputs and outputs you generated on ValYoued. Account credentials are managed by Clerk; delete your account from Profile / Clerk where applicable.",
  });
});

export default router;
