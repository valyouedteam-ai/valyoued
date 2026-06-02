import { pgTable, text, timestamp, uuid, boolean, jsonb } from "drizzle-orm/pg-core";

export const userNotificationsTable = pgTable("user_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  estimateId: text("estimate_id"),
  href: text("href"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserNotificationRow = typeof userNotificationsTable.$inferSelect;

export const marketWatchesTable = pgTable("market_watches", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  label: text("label").notNull(),
  assetClass: text("asset_class").notNull(),
  brand: text("brand"),
  model: text("model"),
  yearFrom: text("year_from"),
  yearTo: text("year_to"),
  snapshot: jsonb("snapshot").notNull().default({}),
  snapshotStatus: text("snapshot_status").notNull().default("ready"),
  snapshotLineage: jsonb("snapshot_lineage").$type<Record<string, unknown>>().notNull().default({}),
  snapshotUpdatedAt: timestamp("snapshot_updated_at", { withTimezone: true }),
  lastRefreshedAt: timestamp("last_refreshed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MarketWatchRow = typeof marketWatchesTable.$inferSelect;

export const inventoryItemsTable = pgTable("inventory_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  estimateId: text("estimate_id"),
  title: text("title").notNull(),
  stage: text("stage").notNull().default("sourced"),
  costBasis: text("cost_basis"),
  listPrice: text("list_price"),
  currency: text("currency").default("GBP"),
  listedAt: timestamp("listed_at", { withTimezone: true }),
  repriceHint: text("reprice_hint"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type InventoryItemRow = typeof inventoryItemsTable.$inferSelect;
