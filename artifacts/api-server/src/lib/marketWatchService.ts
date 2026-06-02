import type { MarketWatchRow } from "@workspace/db";
import type { MarketWatchSnapshot } from "@workspace/api-zod";
import {
  generateMarketWatchSnapshot,
  type StoredMarketWatchLineage,
} from "./marketWatchAgent.js";

export function readMaxRefreshesPerDay(): number {
  const raw = process.env.MARKET_WATCH_MAX_REFRESHES_PER_DAY?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
}

export function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function toApiMarketWatch(row: MarketWatchRow) {
  const lineage = (row.snapshotLineage ?? {}) as StoredMarketWatchLineage;
  const snapshot = row.snapshot as MarketWatchSnapshot;
  return {
    id: row.id,
    label: row.label,
    assetClass: row.assetClass,
    brand: row.brand ?? undefined,
    model: row.model ?? undefined,
    yearFrom: row.yearFrom ? Number(row.yearFrom) : undefined,
    yearTo: row.yearTo ? Number(row.yearTo) : undefined,
    createdAt: row.createdAt,
    snapshotStatus: (row.snapshotStatus ?? "ready") as "pending" | "ready" | "failed",
    snapshotUpdatedAt: row.snapshotUpdatedAt ?? undefined,
    citations: lineage.citationUrls ?? [],
    snapshot,
  };
}

export async function runMarketWatchAgentForRow(row: Pick<
  MarketWatchRow,
  "assetClass" | "brand" | "model" | "label" | "yearFrom" | "yearTo"
>) {
  return generateMarketWatchSnapshot({
    assetClass: row.assetClass,
    brand: row.brand ?? undefined,
    model: row.model ?? undefined,
    label: row.label,
    yearFrom: row.yearFrom ? Number(row.yearFrom) : undefined,
    yearTo: row.yearTo ? Number(row.yearTo) : undefined,
    sellerRegion: "United Kingdom",
  });
}
