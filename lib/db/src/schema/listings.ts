import { pgTable, text, doublePrecision, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";

export const listingsTable = pgTable("listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id"),
  estimateId: uuid("estimate_id").notNull(),
  platform: text("platform").notNull(),
  assetTitle: text("asset_title").notNull(),
  assetTypeName: text("asset_type_name").notNull(),
  draftTitle: text("draft_title").notNull(),
  draftBody: text("draft_body").notNull(),
  suggestedPrice: doublePrecision("suggested_price").notNull(),
  currency: text("currency").notNull(),
  photoTips: jsonb("photo_tips").notNull(),
  hashtags: jsonb("hashtags").notNull(),
  proTips: jsonb("pro_tips").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Listing = typeof listingsTable.$inferSelect;
