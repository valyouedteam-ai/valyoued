import { pgTable, text, doublePrecision, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";

export const estimatesTable = pgTable("estimates", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id"),
  assetTypeId: text("asset_type_id").notNull(),
  assetTypeName: text("asset_type_name").notNull(),
  title: text("title").notNull(),
  currency: text("currency").notNull().default("USD"),
  baselineMid: doublePrecision("baseline_mid").notNull(),
  adjustedMid: doublePrecision("adjusted_mid").notNull(),
  bestArbitrageRegion: text("best_arbitrage_region").notNull(),
  tier: text("tier").notNull(),
  result: jsonb("result").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Estimate = typeof estimatesTable.$inferSelect;
