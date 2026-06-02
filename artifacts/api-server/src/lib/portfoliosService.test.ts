import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { and, eq } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, "../../../..");
dotenv.config({ path: path.join(workspaceRoot, ".env") });
dotenv.config({ path: path.join(workspaceRoot, ".env.local"), override: true });

const hasDb = Boolean(process.env.DATABASE_URL);

function minimalEstimate(userId: string, portfolioId: string) {
  return {
    userId,
    portfolioId,
    assetTypeId: "test_asset",
    assetTypeName: "Test asset",
    title: "Test estimate",
    currency: "USD",
    baselineMid: 100,
    adjustedMid: 100,
    bestArbitrageRegion: "US",
    tier: "everyday",
    result: { ok: true },
  };
}

test("assertPortfolioDeletable rejects null portfolio", { skip: !hasDb }, async () => {
  const { assertPortfolioDeletable, PortfolioDeleteError } = await import("./portfoliosService.js");
  assert.throws(
    () => assertPortfolioDeletable(null),
    (err: unknown) => {
      assert.ok(err instanceof PortfolioDeleteError);
      assert.equal(err.code, "NOT_FOUND");
      return true;
    },
  );
});

test("assertPortfolioDeletable rejects primary portfolio", { skip: !hasDb }, async () => {
  const { assertPortfolioDeletable, PortfolioDeleteError } = await import("./portfoliosService.js");
  assert.throws(
    () =>
      assertPortfolioDeletable({
        id: randomUUID(),
        userId: "user",
        purpose: "primary",
        label: "Primary",
        themeKey: "default",
        createdAt: new Date(),
      }),
    (err: unknown) => {
      assert.ok(err instanceof PortfolioDeleteError);
      assert.equal(err.code, "PRIMARY_FORBIDDEN");
      return true;
    },
  );
});

test("deletePortfolioForUser cannot delete primary", { skip: !hasDb }, async () => {
  const { deletePortfolioForUser, ensurePrimaryPortfolio, PortfolioDeleteError } = await import(
    "./portfoliosService.js"
  );
  const userId = `test-delete-primary-${randomUUID()}`;
  const primary = await ensurePrimaryPortfolio(userId);

  await assert.rejects(
    () => deletePortfolioForUser(userId, primary.id),
    (err: unknown) => {
      assert.ok(err instanceof PortfolioDeleteError);
      assert.equal(err.code, "PRIMARY_FORBIDDEN");
      return true;
    },
  );
});

test("deletePortfolioForUser reassigns estimates and removes pro_board row", { skip: !hasDb }, async () => {
  const { deletePortfolioForUser, ensurePrimaryPortfolio, getPortfolioByIdForUser } = await import(
    "./portfoliosService.js"
  );
  const { db, portfoliosTable, estimatesTable } = await import("@workspace/db");

  const userId = `test-delete-pro-${randomUUID()}`;
  const primary = await ensurePrimaryPortfolio(userId);
  const [desk] = await db
    .insert(portfoliosTable)
    .values({
      userId,
      purpose: "pro_board",
      label: "Trading desk",
      themeKey: "pro_meridian",
    })
    .returning();

  const [estimate] = await db.insert(estimatesTable).values(minimalEstimate(userId, desk!.id)).returning();

  const result = await deletePortfolioForUser(userId, desk!.id);
  assert.equal(result.reassignedEstimateCount, 1);

  const gone = await getPortfolioByIdForUser(desk!.id, userId);
  assert.equal(gone, null);

  const primaryStill = await getPortfolioByIdForUser(primary.id, userId);
  assert.ok(primaryStill);
  assert.equal(primaryStill.purpose, "primary");

  const [moved] = await db.select().from(estimatesTable).where(eq(estimatesTable.id, estimate!.id));
  assert.equal(moved.portfolioId, primary.id);

  await db.delete(estimatesTable).where(eq(estimatesTable.id, estimate!.id));
  await db.delete(portfoliosTable).where(eq(portfoliosTable.userId, userId));
});

test("deletePortfolioForUser removes desk_layout row", { skip: !hasDb }, async () => {
  const { deletePortfolioForUser, ensurePrimaryPortfolio } = await import("./portfoliosService.js");
  const { db, portfoliosTable, deskLayoutsTable } = await import("@workspace/db");

  const userId = `test-delete-layout-${randomUUID()}`;
  await ensurePrimaryPortfolio(userId);
  const [desk] = await db
    .insert(portfoliosTable)
    .values({
      userId,
      purpose: "pro_board",
      label: "Layout desk",
      themeKey: "pro_meridian",
    })
    .returning();

  await db.insert(deskLayoutsTable).values({
    userId,
    portfolioKey: desk!.id,
    widgets: [{ id: "widget-1", visible: true }],
  });

  await deletePortfolioForUser(userId, desk!.id);

  const layouts = await db
    .select()
    .from(deskLayoutsTable)
    .where(and(eq(deskLayoutsTable.userId, userId), eq(deskLayoutsTable.portfolioKey, desk!.id)));
  assert.equal(layouts.length, 0);

  await db.delete(portfoliosTable).where(eq(portfoliosTable.userId, userId));
});

test("deletePortfolioForUser returns NOT_FOUND for other user's portfolio", { skip: !hasDb }, async () => {
  const { deletePortfolioForUser, PortfolioDeleteError } = await import("./portfoliosService.js");
  const { db, portfoliosTable } = await import("@workspace/db");

  const ownerId = `test-delete-owner-${randomUUID()}`;
  const otherId = `test-delete-other-${randomUUID()}`;
  const [desk] = await db
    .insert(portfoliosTable)
    .values({
      userId: ownerId,
      purpose: "pro_board",
      label: "Other user desk",
      themeKey: "pro_meridian",
    })
    .returning();

  await assert.rejects(
    () => deletePortfolioForUser(otherId, desk!.id),
    (err: unknown) => {
      assert.ok(err instanceof PortfolioDeleteError);
      assert.equal(err.code, "NOT_FOUND");
      return true;
    },
  );

  await db.delete(portfoliosTable).where(eq(portfoliosTable.id, desk!.id));
});
