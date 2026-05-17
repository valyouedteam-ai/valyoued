import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

/** Per-user opt-in for transactional / product emails (Clerk holds the address). */
export const userAlertPrefsTable = pgTable("user_alert_prefs", {
  userId: text("user_id").primaryKey(),
  estimateReadyEmail: boolean("estimate_ready_email").notNull().default(false),
  productUpdatesEmail: boolean("product_updates_email").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserAlertPrefs = typeof userAlertPrefsTable.$inferSelect;
