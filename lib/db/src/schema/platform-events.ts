import { pgTable, text, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";

/**
 * Append-only activity log for analytics, admin dashboards, and future Proprietary Model pipelines.
 * Payloads should avoid unnecessary PII: prefer structural fields (ids, asset classes, numeric ranges).
 */
export const platformEventsTable = pgTable("platform_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id"),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull().$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PlatformEvent = typeof platformEventsTable.$inferSelect;
