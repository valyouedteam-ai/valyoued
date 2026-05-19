import { and, eq, asc } from "drizzle-orm";
import { db, portfoliosTable, type Portfolio } from "@workspace/db";

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

export async function createInheritancePortfolio(userId: string): Promise<Portfolio> {
  const [created] = await db
    .insert(portfoliosTable)
    .values({
      userId,
      purpose: INHERITANCE_PURPOSE,
      label: "Inheritance workspace",
      themeKey: "inheritance_lilac",
    })
    .returning();
  return created!;
}

export async function portfolioExistsForPurpose(userId: string, purpose: string): Promise<boolean> {
  const rows = await listPortfoliosForUser(userId);
  return rows.some((r) => r.purpose === purpose);
}

export { PRIMARY_PURPOSE, INHERITANCE_PURPOSE };
