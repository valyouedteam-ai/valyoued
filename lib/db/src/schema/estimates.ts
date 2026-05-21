import { pgTable, text, doublePrecision, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";
import { portfoliosTable } from "./portfolios";

export const estimatesTable = pgTable("estimates", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id"),
  portfolioId: uuid("portfolio_id").references(() => portfoliosTable.id, { onDelete: "set null" }),
  assetTypeId: text("asset_type_id").notNull(),
  assetTypeName: text("asset_type_name").notNull(),
  title: text("title").notNull(),
  currency: text("currency").notNull().default("USD"),
  baselineMid: doublePrecision("baseline_mid").notNull(),
  adjustedMid: doublePrecision("adjusted_mid").notNull(),
  bestArbitrageRegion: text("best_arbitrage_region").notNull(),
  tier: text("tier").notNull(),
  /** hold | monitor | sell: unset until user picks on report. */
  intent: text("intent"),
  result: jsonb("result").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Estimate = typeof estimatesTable.$inferSelect;
