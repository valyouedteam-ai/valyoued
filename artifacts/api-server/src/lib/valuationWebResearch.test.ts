import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDefaultValuationSearchQueries,
  gatherValuationWebResearch,
} from "./valuationWebResearch.js";
import { isWebSearchConfigured } from "./webSearch.js";
import type { AssetType, EstimateInput } from "@workspace/api-zod";

const sampleInput: EstimateInput = {
  assetTypeId: "luxury-bag",
  title: "Chanel Classic Flap Medium",
  brand: "Chanel",
  model: "Classic Flap",
  year: 2020,
  condition: 8,
  currentRegion: "United Kingdom",
  currency: "GBP",
  attributes: "Black lambskin, gold hardware",
};

const sampleAssetType: AssetType = {
  id: "luxury-bag",
  name: "Luxury bag",
  category: "collectibles",
  tagline: "Luxury handbags",
  exampleAttributes: "Brand, model, condition",
  internationallyTradeable: true,
  fields: [],
};

test("buildDefaultValuationSearchQueries includes brand, model, and region", () => {
  const queries = buildDefaultValuationSearchQueries(sampleInput, sampleAssetType);
  assert.ok(queries.length >= 2);
  assert.ok(queries.some((q) => q.includes("Chanel")));
  assert.ok(queries.some((q) => q.toLowerCase().includes("united kingdom") || q.includes("UK")));
});

test("gatherValuationWebResearch returns empty when Tavily is not configured", async () => {
  const prev = process.env.TAVILY_API_KEY;
  delete process.env.TAVILY_API_KEY;
  try {
    assert.equal(isWebSearchConfigured(), false);
    const research = await gatherValuationWebResearch(sampleInput, sampleAssetType);
    assert.deepEqual(research.queries, []);
    assert.deepEqual(research.hits, []);
    assert.deepEqual(research.citationUrls, []);
  } finally {
    if (prev) process.env.TAVILY_API_KEY = prev;
  }
});
