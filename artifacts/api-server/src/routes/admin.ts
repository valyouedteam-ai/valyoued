import { Router, type IRouter } from "express";
import { count, desc, eq, sql } from "drizzle-orm";
import {
  db,
  estimatesTable,
  listingsTable,
  platformEventsTable,
} from "@workspace/db";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();
const adminOnly = Router();

adminOnly.use(requireAdmin);

adminOnly.get("/overview", async (_req, res): Promise<void> => {
  const [estimateAgg] = await db
    .select({
      totalEstimates: sql<number>`count(*)::int`,
      distinctUsers: sql<number>`count(distinct ${estimatesTable.userId}) filter (where ${estimatesTable.userId} is not null)::int`,
    })
    .from(estimatesTable);

  const [listingAgg] = await db
    .select({
      totalListings: sql<number>`count(*)::int`,
    })
    .from(listingsTable);

  const byAssetType = await db
    .select({
      assetTypeName: estimatesTable.assetTypeName,
      count: count(),
    })
    .from(estimatesTable)
    .groupBy(estimatesTable.assetTypeName)
    .orderBy(desc(count()))
    .limit(25);

  const recentEvents = await db
    .select({
      id: platformEventsTable.id,
      eventType: platformEventsTable.eventType,
      userId: platformEventsTable.userId,
      createdAt: platformEventsTable.createdAt,
      payload: platformEventsTable.payload,
    })
    .from(platformEventsTable)
    .orderBy(desc(platformEventsTable.createdAt))
    .limit(80);

  res.json({
    totals: {
      estimates: estimateAgg?.totalEstimates ?? 0,
      distinctUsersWithEstimates: estimateAgg?.distinctUsers ?? 0,
      listings: listingAgg?.totalListings ?? 0,
    },
    estimatesByAssetType: byAssetType.map((r) => ({
      assetTypeName: r.assetTypeName,
      count: r.count,
    })),
    recentEvents: recentEvents.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      userId: e.userId,
      createdAt: e.createdAt.toISOString(),
      payload: e.payload,
    })),
  });
});

adminOnly.get("/users/:userId/activity", async (req, res): Promise<void> => {
  const userId = req.params.userId;
  if (!userId) {
    res.status(400).json({ error: "Missing userId" });
    return;
  }

  const estimates = await db
    .select({
      id: estimatesTable.id,
      title: estimatesTable.title,
      assetTypeName: estimatesTable.assetTypeName,
      adjustedMid: estimatesTable.adjustedMid,
      currency: estimatesTable.currency,
      createdAt: estimatesTable.createdAt,
    })
    .from(estimatesTable)
    .where(eq(estimatesTable.userId, userId))
    .orderBy(desc(estimatesTable.createdAt))
    .limit(50);

  const listings = await db
    .select({
      id: listingsTable.id,
      platform: listingsTable.platform,
      assetTitle: listingsTable.assetTitle,
      suggestedPrice: listingsTable.suggestedPrice,
      currency: listingsTable.currency,
      createdAt: listingsTable.createdAt,
    })
    .from(listingsTable)
    .where(eq(listingsTable.userId, userId))
    .orderBy(desc(listingsTable.createdAt))
    .limit(50);

  const events = await db
    .select()
    .from(platformEventsTable)
    .where(eq(platformEventsTable.userId, userId))
    .orderBy(desc(platformEventsTable.createdAt))
    .limit(100);

  res.json({
    userId,
    estimates: estimates.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
    listings: listings.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
    events: events.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      createdAt: e.createdAt.toISOString(),
      payload: e.payload,
    })),
  });
});

router.use("/admin", adminOnly);

export default router;
