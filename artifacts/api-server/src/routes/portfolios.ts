import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, portfoliosTable } from "@workspace/db";
import { CreatePortfolioBody, DeletePortfolioParams, DeletePortfolioResponse, ListPortfoliosResponse, ListPortfoliosResponseItem } from "@workspace/api-zod";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";
import { resolveUserEntitlements } from "../lib/entitlements";
import {
  reconcilePortfoliosForBilling,
  listPortfoliosForUser,
  ensureInheritancePortfolio,
  deletePortfolioForUser,
  PortfolioDeleteError,
} from "../lib/portfoliosService";

const router: IRouter = Router();

function toApiPortfolio(row: typeof portfoliosTable.$inferSelect) {
  return ListPortfoliosResponseItem.parse({
    id: row.id,
    userId: row.userId,
    purpose: row.purpose,
    label: row.label,
    themeKey: row.themeKey,
    createdAt: row.createdAt.toISOString(),
  });
}

router.get("/portfolios", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).userId!;
  const ent = await resolveUserEntitlements(userId, req);
  await reconcilePortfoliosForBilling(userId, ent.hasInheritanceAddon);
  const rows = await listPortfoliosForUser(userId);
  res.json(ListPortfoliosResponse.parse(rows.map(toApiPortfolio)));
});

router.post("/portfolios", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).userId!;
  const body = CreatePortfolioBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const ent = await resolveUserEntitlements(userId, req);

  if (body.data.purpose === "inheritance") {
    if (!ent.hasInheritanceAddon) {
      res.status(403).json({ error: "Inheritance workspace billing is not active for this account." });
      return;
    }
    const created = await ensureInheritancePortfolio(userId);
    res.json(toApiPortfolio(created));
    return;
  }

  if (body.data.purpose === "pro_board") {
    if (ent.planSlug !== "professional") {
      res.status(403).json({ error: "Extra trading dashboards require the Professional subscription." });
      return;
    }
    const label =
      typeof body.data.label === "string" && body.data.label.trim() !== ""
        ? body.data.label.trim()
        : "Trading dashboard";
    const [created] = await db
      .insert(portfoliosTable)
      .values({
        userId,
        purpose: "pro_board",
        label,
        themeKey: "pro_meridian",
      })
      .returning();
    res.json(toApiPortfolio(created!));
    return;
  }

  res.status(400).json({ error: "Unsupported purpose" });
});

router.delete("/portfolios/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).userId!;
  const params = DeletePortfolioParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const result = await deletePortfolioForUser(userId, params.data.id);
    res.json(DeletePortfolioResponse.parse({ ok: true, reassignedEstimateCount: result.reassignedEstimateCount }));
  } catch (err) {
    if (err instanceof PortfolioDeleteError) {
      if (err.code === "NOT_FOUND") {
        res.status(404).json({ error: err.message });
        return;
      }
      if (err.code === "PRIMARY_FORBIDDEN") {
        res.status(403).json({ error: err.message });
        return;
      }
    }
    throw err;
  }
});

export default router;
