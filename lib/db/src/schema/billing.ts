import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** Stripe subscription snapshot per Clerk user (Webhook-updated). */
export const billingSubscriptionsTable = pgTable("billing_subscriptions", {
  userId: text("user_id").primaryKey(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  status: text("status").notNull().default("inactive"),
  /** Mirrors Clerk metadata / product tier (such as pro). */
  tier: text("tier").notNull().default("free"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BillingSubscription = typeof billingSubscriptionsTable.$inferSelect;
