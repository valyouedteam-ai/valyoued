import type { Request, Response } from "express";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db, billingSubscriptionsTable } from "@workspace/db";
import { logger } from "./lib/logger";
import { isStripeStubMode } from "./lib/stripeStub";
import { classifyStripePriceId } from "./lib/entitlements";

const ACTIVE = new Set(["active", "trialing", "past_due"]);

function summarizeStripeLineItems(items: Stripe.SubscriptionItem[]): {
  planSlug: "everyday_plus" | "professional" | null;
  hasInheritanceAddon: boolean;
} {
  let hasProfessional = false;
  let hasEveryday = false;
  let hasInheritance = false;

  for (const it of items) {
    const pid = typeof it.price === "object" ? it.price?.id : undefined;
    if (!pid) continue;
    const tag = classifyStripePriceId(pid);
    if (!tag) continue;
    if (tag === "inheritance") hasInheritance = true;
    if (tag === "professional") hasProfessional = true;
    if (tag === "everyday_plus") hasEveryday = true;
  }

  const planSlug: "everyday_plus" | "professional" | null = hasProfessional ? "professional" : hasEveryday ? "everyday_plus" : null;

  return { planSlug, hasInheritanceAddon: hasInheritance };
}

async function resolveUserIdFromCustomer(customerId: string | undefined): Promise<string | undefined> {
  if (!customerId) return undefined;
  const [row] = await db
    .select({ userId: billingSubscriptionsTable.userId })
    .from(billingSubscriptionsTable)
    .where(eq(billingSubscriptionsTable.stripeCustomerId, customerId));
  return row?.userId;
}

async function upsertBillingSnapshot(args: {
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  status: string;
  tierDerived: "free" | "pro";
  planSlug: "everyday_plus" | "professional" | null;
  hasInheritanceAddon: boolean;
}): Promise<void> {
  await db
    .insert(billingSubscriptionsTable)
    .values({
      userId: args.userId,
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      status: args.status,
      tier: args.tierDerived,
      planSlug: args.planSlug,
      hasInheritanceAddon: args.hasInheritanceAddon,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: billingSubscriptionsTable.userId,
      set: {
        stripeCustomerId: args.stripeCustomerId,
        stripeSubscriptionId: args.stripeSubscriptionId,
        status: args.status,
        tier: args.tierDerived,
        planSlug: args.planSlug,
        hasInheritanceAddon: args.hasInheritanceAddon,
        updatedAt: new Date(),
      },
    });
}

async function applyStripeSubscription(sub: Stripe.Subscription): Promise<void> {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  let userId: string | undefined =
    typeof sub.metadata?.clerkUserId === "string" ? sub.metadata.clerkUserId : undefined;
  if (!userId && customerId) userId = await resolveUserIdFromCustomer(customerId);
  if (!userId || !customerId) {
    logger.warn({ subId: sub.id }, "Stripe subscription skipped: unknown user linkage");
    return;
  }

  const items = sub.items?.data ?? [];
  const summarized = summarizeStripeLineItems(items);
  const tierDerived: "free" | "pro" = ACTIVE.has(sub.status) ? "pro" : "free";

  await upsertBillingSnapshot({
    userId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: sub.id,
    status: sub.status,
    tierDerived,
    planSlug: ACTIVE.has(sub.status) ? summarized.planSlug : null,
    hasInheritanceAddon: ACTIVE.has(sub.status) ? summarized.hasInheritanceAddon : false,
  });

  logger.info(
    { userId, subStatus: sub.status, planSlug: summarized.planSlug, hasInheritance: summarized.hasInheritanceAddon },
    "billingSubscriptions synced",
  );
}

async function hydrateSubscription(client: Stripe, subId: string): Promise<Stripe.Subscription> {
  return client.subscriptions.retrieve(subId, { expand: ["items.data.price"] });
}

export async function stripeWebhookHandler(req: Request, res: Response): Promise<void> {
  if (isStripeStubMode()) {
    res.json({ received: true, stub: true });
    return;
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!secret || !stripeKey) {
    res.status(503).send("Webhook not configured");
    return;
  }

  const stripe = new Stripe(stripeKey);
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
        const subIdRaw = session.subscription;
        const subId = typeof subIdRaw === "string" ? subIdRaw : subIdRaw?.id;
        if (!userId || !customerId) break;
        if (subId) {
          try {
            const full = await hydrateSubscription(stripe, subId);
            await applyStripeSubscription(full);
          } catch (err) {
            logger.error({ err, subId }, "Could not hydrate subscription after checkout");
            await upsertBillingSnapshot({
              userId,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subId ?? null,
              status: "active",
              tierDerived: "pro",
              planSlug: session.metadata?.planSlug === "professional" ? "professional" : "everyday_plus",
              hasInheritanceAddon: session.metadata?.includeInheritance === "true",
            });
          }
        } else {
          await upsertBillingSnapshot({
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: null,
            status: "active",
            tierDerived: "pro",
            planSlug: session.metadata?.planSlug === "professional" ? "professional" : "everyday_plus",
            hasInheritanceAddon: session.metadata?.includeInheritance === "true",
          });
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        try {
          const full =
            sub.items?.data?.[0]?.price == null ? await hydrateSubscription(stripe, sub.id) : sub;
          await applyStripeSubscription(full);
        } catch (err) {
          logger.error({ err }, "subscription sync failed");
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
