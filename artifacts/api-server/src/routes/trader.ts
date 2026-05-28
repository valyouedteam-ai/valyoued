import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  estimatesTable,
  inventoryItemsTable,
  marketWatchesTable,
} from "@workspace/db";
import {
  BatchRepriceCheckBody,
  CreateInventoryItemBody,
  CreateMarketWatchBody,
  GetBusinessReportQueryParams,
  ListInventoryItemsResponse,
  ListMarketWatchesResponse,
  ListNotificationsResponse,
  PatchInventoryItemBody,
  PatchInventoryItemParams,
  PatchNotificationsBody,
  CreateInventoryItemResponse,
  CreateMarketWatchResponse,
  PatchInventoryItemResponse,
  BatchRepriceCheckResponse,
  GetBusinessReportResponse,
  DeleteMarketWatchParams,
} from "@workspace/api-zod";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";
import { resolveUserEntitlements } from "../lib/entitlements";
import { buildMarketWatchSnapshot } from "../lib/marketWatchSnapshot";
import {
  listUserNotifications,
  markNotificationsRead,
} from "../lib/notificationsService";
import { mergeEstimateResultFromRow } from "../lib/estimateResultMerge";
import { computeTraderAnalytics } from "../lib/traderAnalytics";
import { convertToUsdApprox } from "@workspace/fx-usd";
import { getFxRateSnapshot } from "../lib/fxRates";

const router: IRouter = Router();

function requireTrader(ent: Awaited<ReturnType<typeof resolveUserEntitlements>>, res: import("express").Response): boolean {
  if (!ent.canUseTraderWorkspace) {
    res.status(403).json({ error: "Professional plan required for trader workspace features." });
    return false;
  }
  return true;
}

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).userId!;
  await import("../lib/monitorValueChangeEmail").then((m) =>
    Promise.all([m.runMonitorValueChangeScan(userId), m.runPortfolioHealthNotifications(userId)]),
  );
  const items = await listUserNotifications(userId);
  res.json(ListNotificationsResponse.parse(items));
});

router.patch("/notifications", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).userId!;
  const parsed = PatchNotificationsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updated = await markNotificationsRead(userId, {
    markAllRead: parsed.data.markAllRead,
    ids: parsed.data.ids,
  });
  res.json({ updated });
});

router.get("/market-watches", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).userId!;
  const ent = await resolveUserEntitlements(userId, req);
  if (!requireTrader(ent, res)) return;

  const rows = await db
    .select()
    .from(marketWatchesTable)
    .where(eq(marketWatchesTable.userId, userId))
    .orderBy(desc(marketWatchesTable.createdAt));

  res.json(
    ListMarketWatchesResponse.parse(
      rows.map((r) => ({
        id: r.id,
        label: r.label,
        assetClass: r.assetClass,
        brand: r.brand ?? undefined,
        model: r.model ?? undefined,
        yearFrom: r.yearFrom ? Number(r.yearFrom) : undefined,
        yearTo: r.yearTo ? Number(r.yearTo) : undefined,
        createdAt: r.createdAt,
        snapshot: r.snapshot as ReturnType<typeof buildMarketWatchSnapshot>,
      })),
    ),
  );
});

router.post("/market-watches", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).userId!;
  const ent = await resolveUserEntitlements(userId, req);
  if (!requireTrader(ent, res)) return;

  const parsed = CreateMarketWatchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const snapshot = buildMarketWatchSnapshot({
    assetClass: parsed.data.assetClass,
    brand: parsed.data.brand,
    model: parsed.data.model,
    yearFrom: parsed.data.yearFrom,
    yearTo: parsed.data.yearTo,
  });

  const [row] = await db
    .insert(marketWatchesTable)
    .values({
      userId,
      label: parsed.data.label,
      assetClass: parsed.data.assetClass,
      brand: parsed.data.brand ?? null,
      model: parsed.data.model ?? null,
      yearFrom: parsed.data.yearFrom != null ? String(parsed.data.yearFrom) : null,
      yearTo: parsed.data.yearTo != null ? String(parsed.data.yearTo) : null,
      snapshot,
    })
    .returning();

  res.json(
    CreateMarketWatchResponse.parse({
      id: row.id,
      label: row.label,
      assetClass: row.assetClass,
      brand: row.brand ?? undefined,
      model: row.model ?? undefined,
      yearFrom: row.yearFrom ? Number(row.yearFrom) : undefined,
      yearTo: row.yearTo ? Number(row.yearTo) : undefined,
      createdAt: row.createdAt,
      snapshot,
    }),
  );
});

router.delete("/market-watches/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).userId!;
  const ent = await resolveUserEntitlements(userId, req);
  if (!requireTrader(ent, res)) return;

  const params = DeleteMarketWatchParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db
    .delete(marketWatchesTable)
    .where(and(eq(marketWatchesTable.id, params.data.id), eq(marketWatchesTable.userId, userId)));

  res.json({ ok: true });
});

router.get("/inventory", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).userId!;
  const ent = await resolveUserEntitlements(userId, req);
  if (!requireTrader(ent, res)) return;

  const rows = await db
    .select()
    .from(inventoryItemsTable)
    .where(eq(inventoryItemsTable.userId, userId))
    .orderBy(desc(inventoryItemsTable.updatedAt));

  res.json(
    ListInventoryItemsResponse.parse(
      rows.map((r) => ({
        id: r.id,
        estimateId: r.estimateId,
        title: r.title,
        stage: r.stage,
        costBasis: r.costBasis ? Number(r.costBasis) : undefined,
        listPrice: r.listPrice ? Number(r.listPrice) : undefined,
        currency: r.currency ?? "GBP",
        listedAt: r.listedAt ?? undefined,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        repriceHint: r.repriceHint ?? undefined,
      })),
    ),
  );
});

router.post("/inventory", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).userId!;
  const ent = await resolveUserEntitlements(userId, req);
  if (!requireTrader(ent, res)) return;

  const parsed = CreateInventoryItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await db
    .insert(inventoryItemsTable)
    .values({
      userId,
      title: parsed.data.title,
      stage: parsed.data.stage,
      estimateId: parsed.data.estimateId ?? null,
      costBasis: parsed.data.costBasis != null ? String(parsed.data.costBasis) : null,
      listPrice: parsed.data.listPrice != null ? String(parsed.data.listPrice) : null,
      currency: parsed.data.currency ?? "GBP",
    })
    .returning();

  res.json(
    CreateInventoryItemResponse.parse({
      id: row.id,
      estimateId: row.estimateId,
      title: row.title,
      stage: row.stage,
      costBasis: row.costBasis ? Number(row.costBasis) : undefined,
      listPrice: row.listPrice ? Number(row.listPrice) : undefined,
      currency: row.currency ?? "GBP",
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }),
  );
});

router.patch("/inventory/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).userId!;
  const ent = await resolveUserEntitlements(userId, req);
  if (!requireTrader(ent, res)) return;

  const params = PatchInventoryItemParams.safeParse(req.params);
  const parsed = PatchInventoryItemBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const now = new Date();
  const [row] = await db
    .update(inventoryItemsTable)
    .set({
      ...(parsed.data.stage !== undefined ? { stage: parsed.data.stage } : {}),
      ...(parsed.data.costBasis !== undefined ? { costBasis: String(parsed.data.costBasis) } : {}),
      ...(parsed.data.listPrice !== undefined ? { listPrice: String(parsed.data.listPrice) } : {}),
      ...(parsed.data.listedAt !== undefined ? { listedAt: parsed.data.listedAt } : {}),
      updatedAt: now,
    })
    .where(and(eq(inventoryItemsTable.id, params.data.id), eq(inventoryItemsTable.userId, userId)))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Inventory item not found" });
    return;
  }

  res.json(
    PatchInventoryItemResponse.parse({
      id: row.id,
      estimateId: row.estimateId,
      title: row.title,
      stage: row.stage,
      costBasis: row.costBasis ? Number(row.costBasis) : undefined,
      listPrice: row.listPrice ? Number(row.listPrice) : undefined,
      currency: row.currency ?? "GBP",
      listedAt: row.listedAt ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      repriceHint: row.repriceHint ?? undefined,
    }),
  );
});

router.get("/reports/business", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).userId!;
  const ent = await resolveUserEntitlements(userId, req);
  if (!requireTrader(ent, res)) return;

  const query = GetBusinessReportQueryParams.safeParse(req.query);
  const month =
    query.success && query.data.month
      ? query.data.month
      : new Date().toISOString().slice(0, 7);

  const fx = await getFxRateSnapshot();
  const inv = await db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.userId, userId));
  const estimates = await db.select().from(estimatesTable).where(eq(estimatesTable.userId, userId));

  let inventoryValue = 0;
  let monthlyProfit = 0;
  const categoryProfit = new Map<string, number>();

  for (const item of inv) {
    const price = item.listPrice ? Number(item.listPrice) : 0;
    inventoryValue += convertToUsdApprox(price, item.currency ?? "GBP", fx.rates);
    if (item.stage === "sold" && item.costBasis && item.listPrice) {
      const profit = Number(item.listPrice) - Number(item.costBasis);
      monthlyProfit += profit;
      categoryProfit.set(item.title.split(" ")[0] ?? "Other", (categoryProfit.get(item.title.split(" ")[0] ?? "Other") ?? 0) + profit);
    }
  }

  const slowMovingCount = inv.filter((i) => i.stage === "listed").length;
  const bestCategories = Array.from(categoryProfit.entries())
    .map(([name, profit]) => ({ name, profit }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5);

  const insuranceStockRows = estimates.map((e) => ({
    title: e.title,
    assetType: e.assetTypeName,
    value: e.adjustedMid,
    currency: e.currency,
  }));

  const taxExportRows = inv.map((i) => ({
    title: i.title,
    stage: i.stage,
    costBasis: i.costBasis,
    listPrice: i.listPrice,
    currency: i.currency,
  }));

  res.json(
    GetBusinessReportResponse.parse({
      month,
      monthlyProfit,
      inventoryValue,
      slowMovingCount,
      bestCategories,
      taxExportRows,
      insuranceStockRows,
    }),
  );
});

router.post("/estimates/batch-reprice-check", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).userId!;
  const ent = await resolveUserEntitlements(userId, req);
  if (!requireTrader(ent, res)) return;

  const parsed = BatchRepriceCheckBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const ids = [...(parsed.data.estimateIds ?? []), ...(parsed.data.inventoryIds ?? [])];
  const suggestions = [];

  if (parsed.data.estimateIds?.length) {
    const rows = await db
      .select()
      .from(estimatesTable)
      .where(and(eq(estimatesTable.userId, userId)));
    for (const row of rows.filter((r) => parsed.data.estimateIds!.includes(r.id))) {
      const merged = mergeEstimateResultFromRow(row, row.result);
      const trader = merged.traderAnalytics ?? computeTraderAnalytics({
        input: merged.input,
        adjustedMid: merged.adjustedMid,
        adjustedLow: merged.adjustedLow,
        adjustedHigh: merged.adjustedHigh,
        baselineMid: merged.baselineMid,
      });
      const over = row.adjustedMid - trader.expectedResale;
      if (over > 100) {
        suggestions.push({
          id: row.id,
          title: row.title,
          message: `This item may be overpriced by about £${Math.round(over)} vs comps.`,
          suggestedPrice: trader.expectedResale,
          currentPrice: row.adjustedMid,
        });
      }
    }
  }

  if (parsed.data.inventoryIds?.length) {
    const invRows = await db
      .select()
      .from(inventoryItemsTable)
      .where(eq(inventoryItemsTable.userId, userId));
    for (const item of invRows.filter((i) => parsed.data.inventoryIds!.includes(i.id))) {
      if (item.stage !== "listed" || !item.listPrice) continue;
      const list = Number(item.listPrice);
      suggestions.push({
        id: item.id,
        title: item.title,
        message: `Similar items are selling faster near £${Math.round(list * 0.95)}.`,
        suggestedPrice: Math.round(list * 0.95),
        currentPrice: list,
      });
    }
  }

  res.json(BatchRepriceCheckResponse.parse(suggestions));
});

export default router;
