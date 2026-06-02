import { defaultModel, getLlm } from "@workspace/llm";
import type { AssetType, EstimateInput } from "@workspace/api-zod";
import { extractJson } from "./jsonExtract.js";
import {
  citationUrlsFromHits,
  isWebSearchConfigured,
  searchWeb,
  type WebSearchHit,
} from "./webSearch.js";

export type ValuationWebResearch = {
  queries: string[];
  hits: WebSearchHit[];
  citationUrls: string[];
};

function facetSummary(input: EstimateInput, assetType: AssetType): string {
  const extras = input.extraFields
    ? Object.entries(input.extraFields)
        .filter(([, v]) => v && String(v).trim() !== "")
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")
    : "";
  const bits = [
    input.title,
    assetType.name,
    input.brand,
    input.model,
    input.year != null ? `year ${input.year}` : null,
    `condition ${input.condition}/10`,
    `region ${input.currentRegion}`,
    extras || null,
  ].filter(Boolean);
  return bits.join(" · ");
}

export function buildDefaultValuationSearchQueries(
  input: EstimateInput,
  assetType: AssetType,
): string[] {
  const label = [input.brand, input.model, input.title].filter((p) => p && String(p).trim()).join(" ");
  const year = input.year != null ? ` ${input.year}` : "";
  const region = input.currentRegion || "UK";
  const queries = [
    `${label}${year} sold price ${region}`,
    `${label} ${assetType.name} resale comparables ${region}`,
    `${label} eBay sold completed listing`,
    input.brand && input.model ? `${input.brand} ${input.model} marketplace price trend` : null,
  ].filter((q): q is string => typeof q === "string" && q.trim().length > 8);
  return queries.slice(0, 4);
}

async function planValuationSearchQueries(
  input: EstimateInput,
  assetType: AssetType,
): Promise<string[]> {
  const fallback = buildDefaultValuationSearchQueries(input, assetType);
  try {
    const llm = getLlm();
    const prompt = `You help appraisers research resale market evidence.

Valuation target: ${facetSummary(input, assetType)}

Return a JSON array of 2 to 4 short web search queries to find recent sold prices, auction results, and marketplace comps for this exact item.
Queries should name brand and model when known. Prefer queries that surface eBay sold listings, Chrono24, Vestiaire, Bring a Trailer, AutoTrader, or category-specific resale channels.

Output JSON only: ["query one", "query two"]`;

    const text = await llm.complete({
      model: defaultModel(),
      maxTokens: 800,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = JSON.parse(extractJson(text)) as unknown;
    if (!Array.isArray(raw)) return fallback;
    const queries = raw
      .filter((q): q is string => typeof q === "string" && q.trim() !== "")
      .map((q) => q.trim());
    return queries.length ? queries.slice(0, 4) : fallback;
  } catch {
    return fallback;
  }
}

/** Plan queries and retrieve Tavily snippets for valuation comparables research. */
export async function gatherValuationWebResearch(
  input: EstimateInput,
  assetType: AssetType,
): Promise<ValuationWebResearch> {
  if (!isWebSearchConfigured()) {
    return { queries: [], hits: [], citationUrls: [] };
  }

  const queries = await planValuationSearchQueries(input, assetType);
  const hits = await searchWeb(queries);
  return {
    queries,
    hits,
    citationUrls: citationUrlsFromHits(hits),
  };
}
