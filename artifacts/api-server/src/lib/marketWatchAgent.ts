import { z } from "zod";
import { defaultModel, getConfiguredProviderId, getLlm } from "@workspace/llm";
import type { MarketWatchSnapshot } from "@workspace/api-zod";
import { extractJson } from "./jsonExtract.js";
import { buildMarketWatchSnapshot } from "./marketWatchSnapshot.js";
import {
  citationUrlsFromHits,
  formatWebHitsForPrompt,
  isWebSearchConfigured,
  searchWeb,
  type WebSearchHit,
} from "./webSearch.js";

export const MARKET_WATCH_PROMPT_VERSION = "2026-06-02";

export type StoredMarketWatchLineage = {
  promptVersion: string;
  llmProvider?: string;
  llmModel?: string;
  searchQueries: string[];
  searchHitCount: number;
  citationUrls: string[];
  structuredFallback: boolean;
  generatedAt: string;
  fallbackReason?: string;
};

export type MarketWatchAgentInput = {
  assetClass: string;
  brand?: string;
  model?: string;
  label: string;
  yearFrom?: number;
  yearTo?: number;
  sellerRegion?: string;
};

const demandMovementSchema = z.enum(["rising", "stable", "softening"]);

const marketWatchSnapshotSchema = z.object({
  trendPoints: z
    .array(
      z.object({
        month: z.coerce.string(),
        medianPrice: z.coerce.number(),
      }),
    )
    .min(1),
  recentSales: z.array(
    z.object({
      price: z.coerce.number(),
      soldAt: z.coerce.string().optional(),
      platform: z.coerce.string(),
      condition: z.coerce.string(),
      daysToSell: z.coerce.number().optional(),
      detail: z.coerce.string().optional(),
    }),
  ),
  demandMovement: demandMovementSchema,
  avgDaysToSell: z.coerce.number(),
  bestPlatform: z.coerce.string(),
  suggestedListingPrice: z.coerce.number(),
  buyBelowPrice: z.coerce.number(),
  expectedMarginPct: z.coerce.number(),
  analyticsNote: z.coerce.string().optional(),
});

function finiteNumber(raw: unknown, fallback: number): number {
  const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw.replace(/,/g, "").trim()) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function positiveMoney(raw: unknown, fallback: number): number {
  const n = finiteNumber(raw, fallback);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : Math.max(1, Math.round(fallback));
}

function clampDays(raw: unknown, fallback: number): number {
  const n = finiteNumber(raw, fallback);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(365, Math.max(1, Math.round(n)));
}

function sanitizeSnapshot(raw: unknown, fallback: MarketWatchSnapshot): MarketWatchSnapshot {
  const parsed = marketWatchSnapshotSchema.safeParse(raw);
  if (!parsed.success) return fallback;

  const data = parsed.data;
  const suggested = positiveMoney(data.suggestedListingPrice, fallback.suggestedListingPrice);
  const buyBelow = positiveMoney(data.buyBelowPrice, fallback.buyBelowPrice);
  const margin = finiteNumber(data.expectedMarginPct, fallback.expectedMarginPct);

  return {
    trendPoints: data.trendPoints.map((p, i) => ({
      month: p.month.trim() || fallback.trendPoints[i]?.month || "2026-01",
      medianPrice: positiveMoney(p.medianPrice, fallback.trendPoints[i]?.medianPrice ?? suggested),
    })),
    recentSales: data.recentSales.slice(0, 6).map((sale, i) => ({
      price: positiveMoney(sale.price, fallback.recentSales[i]?.price ?? suggested),
      soldAt: sale.soldAt?.trim() || fallback.recentSales[i]?.soldAt,
      platform: sale.platform.trim() || fallback.recentSales[i]?.platform || "Marketplace",
      condition: sale.condition.trim() || fallback.recentSales[i]?.condition || "Good",
      daysToSell: sale.daysToSell != null ? clampDays(sale.daysToSell, fallback.recentSales[i]?.daysToSell ?? 14) : fallback.recentSales[i]?.daysToSell,
      detail: sale.detail?.trim() || fallback.recentSales[i]?.detail,
    })),
    demandMovement: demandMovementSchema.safeParse(data.demandMovement).success
      ? data.demandMovement
      : fallback.demandMovement,
    avgDaysToSell: clampDays(data.avgDaysToSell, fallback.avgDaysToSell),
    bestPlatform: data.bestPlatform.trim() || fallback.bestPlatform,
    suggestedListingPrice: suggested,
    buyBelowPrice: Math.min(buyBelow, suggested),
    expectedMarginPct: Math.min(100, Math.max(-50, Math.round(margin))),
    analyticsNote: data.analyticsNote?.trim() || fallback.analyticsNote,
  };
}

function facetSummary(input: MarketWatchAgentInput): string {
  const bits = [
    input.label,
    input.assetClass,
    input.brand,
    input.model,
    input.yearFrom != null || input.yearTo != null
      ? `years ${input.yearFrom ?? "?"}-${input.yearTo ?? "?"}`
      : null,
    input.sellerRegion ? `seller region ${input.sellerRegion}` : null,
  ].filter(Boolean);
  return bits.join(" · ");
}

function formatHitsForPrompt(hits: WebSearchHit[]): string {
  return formatWebHitsForPrompt(hits);
}

async function llmComplete(prompt: string, maxTokens: number): Promise<string | null> {
  try {
    const llm = getLlm();
    return await llm.complete({
      model: defaultModel(),
      maxTokens,
      messages: [{ role: "user", content: prompt }],
    });
  } catch {
    return null;
  }
}

async function planSearchQueries(input: MarketWatchAgentInput): Promise<string[]> {
  const region = input.sellerRegion ?? "United Kingdom";
  const prompt = `You help resale traders research market pricing.

Watch target: ${facetSummary(input)}
Region focus: ${region}

Return a JSON array of 2 to 4 short web search queries to find recent sold prices, resale trends, and platform demand for this exact product.
Queries should name brand and model when known. Prefer queries that would surface eBay sold listings, Chrono24, Vestiaire, AutoTrader, or similar resale channels.

Output JSON only: ["query one", "query two"]`;

  const text = await llmComplete(prompt, 800);
  if (!text) return defaultSearchQueries(input);

  try {
    const raw = JSON.parse(extractJson(text)) as unknown;
    if (!Array.isArray(raw)) return defaultSearchQueries(input);
    const queries = raw.filter((q): q is string => typeof q === "string" && q.trim() !== "").map((q) => q.trim());
    return queries.length ? queries.slice(0, 4) : defaultSearchQueries(input);
  } catch {
    return defaultSearchQueries(input);
  }
}

function defaultSearchQueries(input: MarketWatchAgentInput): string[] {
  const label = input.label.trim() || [input.brand, input.model].filter(Boolean).join(" ");
  const year =
    input.yearFrom != null || input.yearTo != null
      ? ` ${input.yearFrom ?? ""}${input.yearTo != null ? `-${input.yearTo}` : ""}`
      : "";
  return [
    `${label}${year} sold price resale ${input.sellerRegion ?? "UK"}`,
    `${label} resale trend marketplace 2025 2026`,
  ].filter((q) => q.trim().length > 3);
}

async function synthesizeSnapshotFromEvidence(
  input: MarketWatchAgentInput,
  hits: WebSearchHit[],
  fallback: MarketWatchSnapshot,
): Promise<MarketWatchSnapshot | null> {
  const region = input.sellerRegion ?? "United Kingdom";
  const prompt = `You synthesize resale market analytics for professional traders.

Watch target: ${facetSummary(input)}
Currency: GBP (integer prices, no decimals)
Region: ${region}

Web search evidence:
${formatHitsForPrompt(hits)}

Using ONLY the evidence above (and clearly labeled estimates when evidence is thin), output strict JSON matching this shape:
{
  "trendPoints": [{"month":"YYYY-MM","medianPrice": number}, ... exactly 6 months ending with the current month],
  "recentSales": [{"price": number, "soldAt": "YYYY-MM-DD", "platform": string, "condition": string, "daysToSell": number, "detail": string referencing a URL from evidence when possible}],
  "demandMovement": "rising" | "stable" | "softening",
  "avgDaysToSell": number,
  "bestPlatform": string,
  "suggestedListingPrice": number,
  "buyBelowPrice": number,
  "expectedMarginPct": number,
  "analyticsNote": string explaining evidence is web-sourced and approximate
}

Rules:
- Prefer prices and platforms mentioned in the snippets.
- recentSales detail should cite a source URL from the evidence when one supports the row.
- buyBelowPrice should be below suggestedListingPrice.
- analyticsNote must mention web research and that figures are approximate.
- Output JSON only.`;

  const text = await llmComplete(prompt, 4000);
  if (!text) return null;

  try {
    const raw = JSON.parse(extractJson(text)) as unknown;
    return sanitizeSnapshot(raw, fallback);
  } catch {
    return null;
  }
}

function buildLineage(args: {
  searchQueries: string[];
  searchHitCount: number;
  citationUrls: string[];
  structuredFallback: boolean;
  fallbackReason?: string;
}): StoredMarketWatchLineage {
  let llmProvider: string | undefined;
  let llmModel: string | undefined;
  try {
    llmProvider = getConfiguredProviderId();
    llmModel = defaultModel();
  } catch {
    // LLM not configured; lineage still records search-only or fallback path.
  }

  return {
    promptVersion: MARKET_WATCH_PROMPT_VERSION,
    llmProvider,
    llmModel,
    searchQueries: args.searchQueries,
    searchHitCount: args.searchHitCount,
    citationUrls: args.citationUrls,
    structuredFallback: args.structuredFallback,
    generatedAt: new Date().toISOString(),
    fallbackReason: args.fallbackReason,
  };
}

export type GenerateMarketWatchSnapshotResult = {
  snapshot: MarketWatchSnapshot;
  lineage: StoredMarketWatchLineage;
  snapshotStatus: "ready" | "failed";
};

/**
 * Agentic Market Watch snapshot: plan searches, retrieve web snippets, synthesize JSON snapshot.
 * Falls back to deterministic stub when search or LLM is unavailable.
 */
export async function generateMarketWatchSnapshot(
  input: MarketWatchAgentInput,
): Promise<GenerateMarketWatchSnapshotResult> {
  const stubFallback = buildMarketWatchSnapshot({
    assetClass: input.assetClass,
    brand: input.brand,
    model: input.model,
    yearFrom: input.yearFrom,
    yearTo: input.yearTo,
  });

  const searchQueries = isWebSearchConfigured() ? await planSearchQueries(input) : defaultSearchQueries(input);
  const hits = isWebSearchConfigured() ? await searchWeb(searchQueries) : [];
  const citationUrls = citationUrlsFromHits(hits);

  if (!isWebSearchConfigured()) {
    return {
      snapshot: {
        ...stubFallback,
        analyticsNote:
          "Illustrative snapshot (web search unavailable). Set TAVILY_API_KEY for live market research.",
      },
      lineage: buildLineage({
        searchQueries,
        searchHitCount: 0,
        citationUrls: [],
        structuredFallback: true,
        fallbackReason: "web_search_unconfigured",
      }),
      snapshotStatus: "ready",
    };
  }

  if (!hits.length) {
    return {
      snapshot: {
        ...stubFallback,
        analyticsNote:
          "Limited web evidence found. Figures use asset-class anchors until richer comps are available.",
      },
      lineage: buildLineage({
        searchQueries,
        searchHitCount: 0,
        citationUrls: [],
        structuredFallback: true,
        fallbackReason: "no_search_hits",
      }),
      snapshotStatus: "ready",
    };
  }

  const synthesized = await synthesizeSnapshotFromEvidence(input, hits, stubFallback);
  if (!synthesized) {
    return {
      snapshot: {
        ...stubFallback,
        analyticsNote:
          "Web snippets were retrieved but synthesis failed. Showing approximate asset-class anchors.",
      },
      lineage: buildLineage({
        searchQueries,
        searchHitCount: hits.length,
        citationUrls,
        structuredFallback: true,
        fallbackReason: "llm_synthesis_failed",
      }),
      snapshotStatus: "ready",
    };
  }

  return {
    snapshot: synthesized,
    lineage: buildLineage({
      searchQueries,
      searchHitCount: hits.length,
      citationUrls,
      structuredFallback: false,
    }),
    snapshotStatus: "ready",
  };
}

/** Exported for unit tests. */
export { marketWatchSnapshotSchema, sanitizeSnapshot, defaultSearchQueries, planSearchQueries };
