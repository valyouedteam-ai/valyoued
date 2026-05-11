import type { Request, Response } from "express";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db, billingSubscriptionsTable } from "@workspace/db";
import { logger } from "./lib/logger";
import { isStripeStubMode } from "./lib/stripeStub";

function subscriptionTier(status: string): "free" | "pro" {
  const active = ["active", "trialing", "past_due"].includes(status);
  return active ? "pro" : "free";
}

async function resolveUserIdFromCustomer(customerId: string | undefined): Promise<string | undefined> {
  if (!customerId) return undefined;
  const [row] = await db
    .select({ userId: billingSubscriptionsTable.userId })
    .from(billingSubscriptionsTable)
    .where(eq(billingSubscriptionsTable.stripeCustomerId, customerId));
  return row?.userId;
}

export async function stripeWebhookHandler(req: Request, res: Response): Promise<void> {
  if (isStripeStubMode()) {
    res.json({ received: true, stub: true });
    return;
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!secret || !key) {
    res.status(503).send("Webhook not configured");
    return;
  }

  const stripe = new Stripe(key);
  const sig = req.headers["stripe-signature"];
  if (typeof sig !== "string") {
    res.status(400).send("Missing stripe-signature");
    return;
  }

  if (!Buffer.isBuffer(req.body)) {
    res.status(400).send("Expected raw body");
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    logger.warn({ err }, "Stripe webhook signature verification failed");
    res.status(400).send("Webhook Error");
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.clerkUserId;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subId =
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (userId && customerId) {
          await db
            .insert(billingSubscriptionsTable)
            .values({
              userId,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subId ?? null,
              status: "active",
              tier: "pro",
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: billingSubscriptionsTable.userId,
              set: {
                stripeCustomerId: customerId,
                stripeSubscriptionId: subId ?? null,
                status: "active",
                tier: "pro",
                updatedAt: new Date(),
              },
            });
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        const userId =
          sub.metadata?.clerkUserId ?? (await resolveUserIdFromCustomer(customerId ?? undefined));
        const tier = subscriptionTier(sub.status);
        if (userId) {
          await db
            .insert(billingSubscriptionsTable)
            .values({
              userId,
              stripeCustomerId: customerId ?? null,
              stripeSubscriptionId: sub.id,
              status: sub.status,
              tier,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: billingSubscriptionsTable.userId,
              set: {
                stripeCustomerId: customerId ?? null,
                stripeSubscriptionId: sub.id,
                status: sub.status,
                tier,
                updatedAt: new Date(),
              },
            });
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    logger.error({ err, type: event.type }, "Stripe webhook handler error");
    res.status(500).send("handler error");
    return;
  }

  res.json({ received: true });
}
