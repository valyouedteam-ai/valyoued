import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, estimatesTable, deskLayoutsTable } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";
import { resolveUserEntitlements } from "../lib/entitlements";
import { getFxRateSnapshot } from "../lib/fxRates";
import { computeEstimateStatsFromRows } from "../lib/estimateStatsRollup";
import { ensurePrimaryPortfolio, getPortfolioByIdForUser } from "../lib/portfoliosService";
import { buildCuratedDeskFeed } from "../lib/deskFeed";

type EstimateRow = typeof estimatesTable.$inferSelect;

const router = Router();

const DEFAULT_WIDGETS: { id: string; visible: boolean }[] = [
  { id: "rollup", visible: true },
  { id: "by_asset", visible: true },
  { id: "regions", visible: true },
  { id: "feed", visible: true },
];

function portfolioKey(raw: string | undefined): string {
  const t = typeof raw === "string" ? raw.trim() : "";
  return t === "" ? "" : t;
}

function portfolioScopeRows(
  rows: EstimateRow[],
  primaryPortfolioId: string,
  requestedPortfolioId?: string | null,
): EstimateRow[] {
  const scopeId = requestedPortfolioId?.trim() ? requestedPortfolioId.trim() : primaryPortfolioId;
  if (scopeId === primaryPortfolioId) {
    return rows.filter((r) => !r.portfolioId || r.portfolioId === primaryPortfolioId);
  }
  return rows.filter((r) => r.portfolioId === scopeId);
}

router.get("/me/desk/stats", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).userId!;
  const ent = await resolveUserEntitlements(userId);
  if (ent.planSlug !== "professional") {
    res.status(403).json({ error: "Desk analytics require the Professional plan." });
    return;
  }

  const primary = await ensurePrimaryPortfolio(userId);
  const pfParam = typeof req.query.portfolioId === "string" ? req.query.portfolioId.trim() : "";
  if (pfParam) {
    const pf = await getPortfolioByIdForUser(pfParam, userId);
    if (!pf) {
      res.status(400).json({ error: "portfolioId must reference one of your portfolios." });
      return;
    }
  }

  const allRows = await db.select().from(estimatesTable).where(eq(estimatesTable.userId, userId));
  const scoped = portfolioScopeRows(allRows, primary.id, pfParam || null);
  const fx = await getFxRateSnapshot();
  const stats = computeEstimateStatsFromRows(
    scoped.map((r) => ({
      baselineMid: r.baselineMid,
      adjustedMid: r.adjustedMid,
      currency: r.currency,
      assetTypeName: r.assetTypeName,
      bestArbitrageRegion: r.bestArbitrageRegion,
    })),
    fx.rates,
  );

  res.json({
    stats,
    scope: {
      portfolioId: pfParam === "" ? primary.id : pfParam,
      workspace: pfParam === "" ? "primary_or_unassigned" : "explicit_portfolio",
    },
    fetchedAt: new Date().toISOString(),
  });
});

const PatchDeskLayoutBody = z
  .object({
    portfolioKey: z.string().optional(),
    widgets: z.array(z.object({ id: z.string().min(1), visible: z.boolean().optional() })).min(1),
  })
  .strict();

router.get("/me/desk/layout", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).userId!;
  const ent = await resolveUserEntitlements(userId);
  if (ent.planSlug !== "professional") {
    res.status(403).json({ error: "Desk layout requires the Professional plan." });
    return;
  }
  const pk = portfolioKey(typeof req.query.portfolioId === "string" ? req.query.portfolioId : undefined);
  const [row] = await db
    .select()
    .from(deskLayoutsTable)
    .where(and(eq(deskLayoutsTable.userId, userId), eq(deskLayoutsTable.portfolioKey, pk)));
  res.json({
    portfolioKey: pk,
    widgets: row?.widgets?.length ? row.widgets : DEFAULT_WIDGETS,
    updatedAt: row?.updatedAt?.toISOString() ?? null,
  });
});

router.patch("/me/desk/layout", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).userId!;
  const ent = await resolveUserEntitlements(userId);
  if (ent.planSlug !== "professional") {
    res.status(403).json({ error: "Desk layout requires the Professional plan." });
    return;
  }

  const parsed = PatchDeskLayoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const pk = portfolioKey(parsed.data.portfolioKey ?? "");
  const now = new Date();
  await db
    .insert(deskLayoutsTable)
    .values({
      userId,
      portfolioKey: pk,
      widgets: parsed.data.widgets.map((w) => ({ ...w, visible: w.visible !== false })),
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [deskLayoutsTable.userId, deskLayoutsTable.portfolioKey],
      set: {
        widgets: parsed.data.widgets.map((w) => ({ ...w, visible: w.visible !== false })),
        updatedAt: now,
      },
    });
  res.json({ ok: true, portfolioKey: pk, widgets: parsed.data.widgets });
});

router.get("/me/desk/feed", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).userId!;
  const ent = await resolveUserEntitlements(userId);
  if (ent.planSlug !== "professional") {
    res.status(403).json({ error: "Desk feed requires the Professional plan." });
    return;
  }
  const primary = await ensurePrimaryPortfolio(userId);
  const pfParam = typeof req.query.portfolioId === "string" ? req.query.portfolioId.trim() : "";
  const allRows = await db.select().from(estimatesTable).where(eq(estimatesTable.userId, userId));
  const scoped = portfolioScopeRows(allRows, primary.id, pfParam || null);
  const tally = new Map<string, number>();
  for (const r of scoped) {
    tally.set(r.assetTypeName, (tally.get(r.assetTypeName) ?? 0) + 1);
  }
  const top = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map((x) => x[0]);
  const bundle = buildCuratedDeskFeed(top.length ? top : ["Trading mix"]);
  res.json(bundle);
});

export default router;
