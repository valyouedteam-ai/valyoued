import { and, eq, asc } from "drizzle-orm";
import { db, portfoliosTable, estimatesTable, type Portfolio } from "@workspace/db";

const PRIMARY_PURPOSE = "primary";
const INHERITANCE_PURPOSE = "inheritance";

export async function listPortfoliosForUser(userId: string): Promise<Portfolio[]> {
  return db.select().from(portfoliosTable).where(eq(portfoliosTable.userId, userId)).orderBy(asc(portfoliosTable.createdAt));
}

export async function ensurePrimaryPortfolio(userId: string): Promise<Portfolio> {
  const rows = await listPortfoliosForUser(userId);
  const primary = rows.find((r) => r.purpose === PRIMARY_PURPOSE);
  if (primary) return primary;
  const [created] = await db
    .insert(portfoliosTable)
    .values({
      userId,
      purpose: PRIMARY_PURPOSE,
      label: "My portfolio",
      themeKey: "default",
    })
    .returning();
  return created!;
}

/** Returns primary id (creates primary if missing). */
export async function resolveDefaultPortfolioId(userId: string): Promise<string> {
  const p = await ensurePrimaryPortfolio(userId);
  return p.id;
}

export async function getPortfolioByIdForUser(
  portfolioId: string | undefined | null,
  userId: string,
): Promise<Portfolio | null> {
  if (!portfolioId || portfolioId.trim() === "") return null;
  const [row] = await db
    .select()
    .from(portfoliosTable)
    .where(and(eq(portfoliosTable.id, portfolioId), eq(portfoliosTable.userId, userId)));
  return row ?? null;
}

export async function ensureInheritancePortfolio(userId: string): Promise<Portfolio> {
  const rows = await listPortfoliosForUser(userId);
  const inh = rows.find((r) => r.purpose === INHERITANCE_PURPOSE);
  if (inh) return inh;
  const [created] = await db
    .insert(portfoliosTable)
    .values({
      userId,
      purpose: INHERITANCE_PURPOSE,
      label: "Inheritance portfolio",
      themeKey: "inheritance_twilight",
    })
    .returning();
  return created!;
}

/**
 * Primary always exists first. Inheritance workspaces exist only while the Stripe add-on is active.
 */
export async function reconcilePortfoliosForBilling(userId: string, hasInheritanceAddon: boolean): Promise<void> {
  await ensurePrimaryPortfolio(userId);
  if (hasInheritanceAddon) {
    await ensureInheritancePortfolio(userId);
  } else {
    await retireInheritancePortfoliosForUser(userId);
  }
}

/**
 * Moves inheritance estimates onto primary then deletes stale inheritance portfolios (add-on canceled).
 */
export async function retireInheritancePortfoliosForUser(userId: string): Promise<void> {
  const rows = await listPortfoliosForUser(userId);
  const primary = rows.find((r) => r.purpose === PRIMARY_PURPOSE);
  const inheritanceRows = rows.filter((r) => r.purpose === INHERITANCE_PURPOSE);
  if (!primary || inheritanceRows.length === 0) return;

  await db.transaction(async (tx) => {
    for (const inh of inheritanceRows) {
      await tx
        .update(estimatesTable)
        .set({ portfolioId: primary.id })
        .where(and(eq(estimatesTable.userId, userId), eq(estimatesTable.portfolioId, inh.id)));
      await tx.delete(portfoliosTable).where(and(eq(portfoliosTable.id, inh.id), eq(portfoliosTable.userId, userId)));
    }
  });
}

export async function portfolioExistsForPurpose(userId: string, purpose: string): Promise<boolean> {
  const rows = await listPortfoliosForUser(userId);
  return rows.some((r) => r.purpose === purpose);
}

export { PRIMARY_PURPOSE, INHERITANCE_PURPOSE };
