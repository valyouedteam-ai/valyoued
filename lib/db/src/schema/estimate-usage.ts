import { pgTable, text, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";

/** Rolling count of valuations per user per UTC calendar month (YYYY-MM). */
export const estimateUsageMonthlyTable = pgTable(
  "estimate_usage_monthly",
  {
    userId: text("user_id").notNull(),
    yearMonth: text("year_month").notNull(),
    count: integer("count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.yearMonth] })],
);

export type EstimateUsageMonthly = typeof estimateUsageMonthlyTable.$inferSelect;
