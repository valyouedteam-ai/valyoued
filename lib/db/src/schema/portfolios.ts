import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";

/** User-owned portfolio workspace (primary, inheritance add-on, or pro board). */
export const portfoliosTable = pgTable("portfolios", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  purpose: text("purpose").notNull(),
  /** Short display title */
  label: text("label").notNull(),
  themeKey: text("theme_key").notNull().default("default"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Portfolio = typeof portfoliosTable.$inferSelect;
