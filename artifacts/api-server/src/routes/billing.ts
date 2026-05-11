import { Router, type IRouter } from "express";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db, billingSubscriptionsTable } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";
import { logger } from "../lib/logger";
import { isStripeStubMode } from "../lib/stripeStub";

const router: IRouter = Router();

function billingBaseUrl(): string {
  return process.env.PUBLIC_APP_URL ?? process.env.VITE_APP_ORIGIN ?? "http://localhost:5173";
}

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
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
  const priceId = process.env.STRIPE_PRICE_PRO;
  if (!stripe || !priceId) {
    res.status(503).json({
      error:
        "Stripe billing is not configured. Set STRIPE_SECRET_KEY and STRIPE_PRICE_PRO (Checkout Price ID for ValYoued Pro).",
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
      })
      .onConflictDoUpdate({
        target: billingSubscriptionsTable.userId,
        set: { stripeCustomerId: customerId, updatedAt: new Date() },
      });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl.replace(/\/$/, "")}/settings?checkout=success`,
      cancel_url: `${baseUrl.replace(/\/$/, "")}/settings?checkout=cancel`,
      metadata: { clerkUserId: userId },
      subscription_data: {
        metadata: { clerkUserId: userId },
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
