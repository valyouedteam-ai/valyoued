import { Router, type IRouter } from "express";
import Stripe from "stripe";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, billingSubscriptionsTable } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";
import { logger } from "../lib/logger";
import { isStripeStubMode } from "../lib/stripeStub";

const router: IRouter = Router();

const CheckoutSessionBody = z
  .object({
    plan: z.enum(["everyday_plus", "professional"]).default("everyday_plus"),
  })
  .strict();

function billingBaseUrl(): string {
  return process.env.PUBLIC_APP_URL ?? process.env.VITE_APP_ORIGIN ?? "http://localhost:5173";
}

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

function parseTrialDaysProfessional(): number | undefined {
  const raw = process.env.STRIPE_PROFESSIONAL_TRIAL_DAYS?.trim();
  if (!raw) return 14;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.round(n);
}

router.post("/billing/checkout-session", requireAuth, async (req, res): Promise<void> => {
  const baseUrl = billingBaseUrl();
  if (isStripeStubMode()) {
    res.json({
      url: `${baseUrl.replace(/\/$/, "")}/settings?checkout=stub`,
      stub: true,
    });
    return;
  }

  const stripe = getStripe();

  const body = CheckoutSessionBody.safeParse(typeof req.body === "object" && req.body !== null ? req.body : {});
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const everyday = process.env.STRIPE_PRICE_EVERYDAY_PLUS?.trim();
  const professional = process.env.STRIPE_PRICE_PROFESSIONAL?.trim();
  const legacyPro = process.env.STRIPE_PRICE_PRO?.trim();

  const primaryPrice =
    body.data.plan === "professional"
      ? professional ?? legacyPro
      : everyday ?? legacyPro;

  if (!stripe || !primaryPrice) {
    res.status(503).json({
      error:
        "Stripe billing is not configured. Set STRIPE_SECRET_KEY and Everyday / Professional Stripe Price IDs " +
        "(see STRIPE_PRICE_EVERYDAY_PLUS, STRIPE_PRICE_PROFESSIONAL, or fallback STRIPE_PRICE_PRO).",
    });
    return;
  }

  const userId = (req as AuthedRequest).userId!;
  const [existing] = await db
    .select()
    .from(billingSubscriptionsTable)
    .where(eq(billingSubscriptionsTable.userId, userId));

  let customerId = existing?.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { clerkUserId: userId },
    });
    customerId = customer.id;
    await db
      .insert(billingSubscriptionsTable)
      .values({
        userId,
        stripeCustomerId: customerId,
        status: "inactive",
        tier: "free",
        planSlug: null,
        hasInheritanceAddon: false,
      })
      .onConflictDoUpdate({
        target: billingSubscriptionsTable.userId,
        set: { stripeCustomerId: customerId, updatedAt: new Date() },
      });
  }

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [{ price: primaryPrice, quantity: 1 }];

  const planSlugMeta = body.data.plan === "professional" ? "professional" : "everyday_plus";
  const trialDays =
    body.data.plan === "professional" ? parseTrialDaysProfessional() : undefined;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: lineItems,
      success_url: `${baseUrl.replace(/\/$/, "")}/settings?checkout=success`,
      cancel_url: `${baseUrl.replace(/\/$/, "")}/settings?checkout=cancel`,
      metadata: { clerkUserId: userId, planSlug: planSlugMeta },
      subscription_data: {
        metadata: { clerkUserId: userId, planSlug: planSlugMeta },
        ...(trialDays != null ? { trial_period_days: trialDays } : {}),
      },
    });
    if (!session.url) {
      res.status(502).json({ error: "Stripe did not return a checkout URL." });
      return;
    }
    res.json({ url: session.url });
  } catch (err) {
    logger.error({ err }, "Stripe checkout session failed");
    res.status(502).json({ error: "Could not start checkout. Try again shortly." });
  }
});

router.post("/billing/customer-portal", requireAuth, async (req, res): Promise<void> => {
  const baseUrl = billingBaseUrl();
  if (isStripeStubMode()) {
    res.json({
      url: `${baseUrl.replace(/\/$/, "")}/settings?portal=stub`,
      stub: true,
    });
    return;
  }

  const stripe = getStripe();
  if (!stripe) {
    res.status(503).json({ error: "Stripe is not configured." });
    return;
  }

  const userId = (req as AuthedRequest).userId!;
  const [existing] = await db
    .select()
    .from(billingSubscriptionsTable)
    .where(eq(billingSubscriptionsTable.userId, userId));

  if (!existing?.stripeCustomerId) {
    res.status(400).json({ error: "No billing profile yet. Subscribe via Checkout first." });
    return;
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: existing.stripeCustomerId,
      return_url: `${baseUrl.replace(/\/$/, "")}/settings`,
    });
    res.json({ url: session.url });
  } catch (err) {
    logger.error({ err }, "Stripe customer portal failed");
    res.status(502).json({ error: "Could not open billing portal." });
  }
});

export default router;
