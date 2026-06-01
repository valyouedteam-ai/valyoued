import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

/** Stripe subscription snapshot per Clerk user (Webhook-updated). */
export const billingSubscriptionsTable = pgTable("billing_subscriptions", {
  userId: text("user_id").primaryKey(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  /** Optional second subscription Stripe object when inheritance is billed separately from the valuation plan. */
  stripeInheritanceSubscriptionId: text("stripe_inheritance_subscription_id"),
  status: text("status").notNull().default("inactive"),
  /** Legacy: derived boolean when paid valuation features active (tier `pro`). */
  tier: text("tier").notNull().default("free"),
  /** `everyday_plus` (Everyday) | `professional` (Professional) when subscribed; omit when free. */
  planSlug: text("plan_slug"),
  hasInheritanceAddon: boolean("has_inheritance_addon").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BillingSubscription = typeof billingSubscriptionsTable.$inferSelect;
