import { pgTable, text, doublePrecision, timestamp, jsonb, uuid, boolean } from "drizzle-orm/pg-core";
import { portfoliosTable } from "./portfolios";

/** Persisted per estimate for reproducibility and proprietary model pipelines. See docs/VALUATIONS_AND_PROPRIETARY_MODEL.md. */
export type StoredValuationLineage = {
  promptVersion?: string;
  promptSha256?: string;
  llmProvider?: string;
  llmModel?: string;
  /** Stable id for optional internal comp retrieval slice (past ValYoued rows). */
  retrievalSnapshotId?: string | null;
  internalArchiveMatchCount?: number;
  newsArticleCount?: number;
  structuredFallback?: boolean;
  /** Set on the server when running A/B or shadow experiments (env VALUATION_EXPERIMENT_KEY). */
  experimentKey?: string | null;
  /** Web search queries planned for this valuation (Tavily). */
  webSearchQueries?: string[];
  webSearchHitCount?: number;
  /** Source URLs from web research snippets fed into the valuation prompt. */
  citationUrls?: string[];
};

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
  /** Model and prompt lineage for replay, eval, and eventual training. */
  lineage: jsonb("lineage").notNull().default({}).$type<StoredValuationLineage>(),
  /** Optional user-reported realized sale (same currency as valuation unless outcomeCurrency set). */
  outcomeSoldPrice: doublePrecision("outcome_sold_price"),
  outcomeCurrency: text("outcome_currency"),
  outcomeRecordedAt: timestamp("outcome_recorded_at", { withTimezone: true }),
  feedbackHelpful: boolean("feedback_helpful"),
  feedbackRecordedAt: timestamp("feedback_recorded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Estimate = typeof estimatesTable.$inferSelect;
