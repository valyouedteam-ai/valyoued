import { pgTable, text, jsonb, timestamp, primaryKey } from "drizzle-orm/pg-core";

/** Widget entries persisted for /desk dashboards (Professional). */
export type DeskWidgetPersisted = {
  id: string;
  visible?: boolean;
};

export const deskLayoutsTable = pgTable(
  "desk_layouts",
  {
    userId: text("user_id").notNull(),
    /** '' = global default desk; otherwise a portfolio UUID string. */
    portfolioKey: text("portfolio_key").notNull(),
    widgets: jsonb("widgets").$type<DeskWidgetPersisted[]>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.portfolioKey] }),
  }),
);

export type DeskLayout = typeof deskLayoutsTable.$inferSelect;
