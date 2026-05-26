import { and, desc, eq, ilike, ne } from "drizzle-orm";
import { db, estimatesTable } from "@workspace/db";
import { sha256Utf8 } from "./valuationLineage";
import { logger } from "./logger";

const PILOT_ASSET_TYPE = "luxury-watch";

function envFlag(name: string): boolean {
  const v = process.env[name]?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function titleTokens(title: string): string[] {
  return title
    .split(/[^a-zA-Z0-9]+/g)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3)
    .slice(0, 3);
}

/**
 * Pilot: retrieve a few similar past ValYoued estimates (same asset class, overlapping title tokens)
 * and surface them as weak context. Only runs when INTERNAL_COMP_ARCHIVE=1 and assetTypeId is the pilot vertical.
 * Budget: INTERNAL_COMP_ARCHIVE_BUDGET_MS (default 120ms) best-effort timeout.
 */
export async function fetchInternalArchiveContext(args: {
  assetTypeId: string;
  title: string;
  /** Exclude current row when patching is not applicable at create time. */
  excludeEstimateId?: string;
}): Promise<{ snapshotId: string; promptBlock: string; matchCount: number } | null> {
  if (!envFlag("INTERNAL_COMP_ARCHIVE") || args.assetTypeId !== PILOT_ASSET_TYPE) {
    return null;
  }

  const tokens = titleTokens(args.title);
  if (tokens.length === 0) return null;

  const budgetMs = Math.min(
    500,
    Math.max(30, Number.parseInt(process.env.INTERNAL_COMP_ARCHIVE_BUDGET_MS?.trim() ?? "120", 10) || 120),
  );

  const whereParts = [eq(estimatesTable.assetTypeId, args.assetTypeId), ...tokens.map((t) => ilike(estimatesTable.title, `%${t}%`))];
  if (args.excludeEstimateId) {
    whereParts.push(ne(estimatesTable.id, args.excludeEstimateId));
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), budgetMs);

  try {
    const rows = await db
      .select({
        id: estimatesTable.id,
        title: estimatesTable.title,
        adjustedMid: estimatesTable.adjustedMid,
        currency: estimatesTable.currency,
        createdAt: estimatesTable.createdAt,
      })
      .from(estimatesTable)
      .where(and(...whereParts))
      .orderBy(desc(estimatesTable.createdAt))
      .limit(5);

    if (rows.length === 0) return null;

    const snapshotId = sha256Utf8(rows.map((r) => r.id).sort().join("|"));
    const lines = rows.map(
      (r) =>
        `- ${r.currency} ${Math.round(r.adjustedMid).toLocaleString("en-US")} · ${r.title.slice(0, 80)}${r.title.length > 80 ? "..." : ""} · ${r.createdAt.toISOString().slice(0, 10)}`,
    );
    const promptBlock = [
      `retrievalSnapshotId: ${snapshotId}`,
      "These rows are prior ValYoued valuations, not external sold listings. Use only as weak directional context; still produce your own comparables and prices.",
      ...lines,
    ].join("\n");

    return { snapshotId, promptBlock, matchCount: rows.length };
  } catch (err) {
    logger.warn({ err, assetTypeId: args.assetTypeId }, "internal archive retrieval skipped");
    return null;
  } finally {
    clearTimeout(timer);
  }
}
