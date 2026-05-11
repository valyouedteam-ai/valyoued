import { pgTable, text, doublePrecision, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";

export const valuationsTable = pgTable("valuations", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyName: text("company_name").notNull(),
  sectorId: text("sector_id").notNull(),
  sectorName: text("sector_name").notNull(),
  revenue: doublePrecision("revenue").notNull(),
  revenueGrowth: doublePrecision("revenue_growth").notNull(),
  grossMargin: doublePrecision("gross_margin").notNull(),
  netMargin: doublePrecision("net_margin").notNull(),
  riskScore: doublePrecision("risk_score").notNull(),
  sentimentScore: doublePrecision("sentiment_score").notNull(),
  comparablesMultiple: doublePrecision("comparables_multiple").notNull(),
  notes: text("notes"),
  baselineValuation: doublePrecision("baseline_valuation").notNull(),
  adjustedValuation: doublePrecision("adjusted_valuation").notNull(),
  result: jsonb("result").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Valuation = typeof valuationsTable.$inferSelect;
export type InsertValuation = typeof valuationsTable.$inferInsert;
