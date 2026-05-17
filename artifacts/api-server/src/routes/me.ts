import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, estimatesTable, listingsTable, billingSubscriptionsTable } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";
import { isAuthStubMode } from "../lib/authStub";
import { isStripeStubMode } from "../lib/stripeStub";
import { getUserAlertPrefs, upsertUserAlertPrefs } from "../lib/userAlertPrefs";
import {
  getClerkPrimaryEmail,
  isEmailDeliveryConfigured,
  publicAppBaseUrl,
  sendHtmlEmail,
} from "../lib/emailDelivery";

const router: IRouter = Router();

const PatchEmailAlertsBody = z
  .object({
    estimateReadyEmail: z.boolean().optional(),
    productUpdatesEmail: z.boolean().optional(),
  })
  .strict()
  .refine((o) => o.estimateReadyEmail !== undefined || o.productUpdatesEmail !== undefined, {
    message: "Provide at least one of estimateReadyEmail, productUpdatesEmail",
  });

router.get("/me/email-alerts", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).userId!;
  const prefs = await getUserAlertPrefs(userId);
  res.json({
    ...prefs,
    deliveryEnabled: isEmailDeliveryConfigured(),
  });
});

router.patch("/me/email-alerts", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).userId!;
  const parsed = PatchEmailAlertsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((e) => e.message).join("; ") });
    return;
  }
  const next = await upsertUserAlertPrefs(userId, parsed.data);
  res.json({
    ...next,
    deliveryEnabled: isEmailDeliveryConfigured(),
  });
});

router.post("/me/email-alerts/test", requireAuth, async (req, res): Promise<void> => {
  if (isAuthStubMode()) {
    res.status(400).json({ error: "Test email is not available in auth stub mode." });
    return;
  }
  if (!isEmailDeliveryConfigured()) {
    res.status(503).json({
      error:
        "Email delivery is not configured. Set RESEND_API_KEY and EMAIL_FROM on the API server.",
    });
    return;
  }
  const userId = (req as AuthedRequest).userId!;
  const to = await getClerkPrimaryEmail(userId);
  if (!to) {
    res.status(400).json({ error: "No primary email found for your account." });
    return;
  }
  const base = publicAppBaseUrl().replace(/\/$/, "");
  const sent = await sendHtmlEmail({
    to,
    subject: "ValYoued email alerts test",
    html: `<p>This is a test message from ValYoued.</p><p>If you received it, email delivery is working. Open the app: <a href="${base}">${base}</a></p>`,
  });
  if (!sent.ok) {
    res.status(502).json({ error: sent.error });
    return;
  }
  res.json({ ok: true });
});

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

  const emailAlertPreferences = await getUserAlertPrefs(userId);

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
    emailAlertPreferences,
    privacyNote:
      "This export contains valuation inputs and outputs you generated on ValYoued. Account credentials are managed by Clerk; delete your account from Profile / Clerk where applicable.",
  });
});

export default router;
