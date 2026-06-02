import test from "node:test";
import assert from "node:assert/strict";
import { defaultSearchQueries, sanitizeSnapshot } from "./marketWatchAgent.js";
import { buildMarketWatchSnapshot } from "./marketWatchSnapshot.js";
import { isWebSearchConfigured, searchWeb } from "./webSearch.js";

test("defaultSearchQueries includes brand and model facets", () => {
  const queries = defaultSearchQueries({
    assetClass: "Luxury Bags",
    brand: "Chanel",
    model: "Classic Flap (Medium)",
    label: "Chanel Classic Flap (Medium)",
  });
  assert.ok(queries.length >= 2);
  assert.ok(queries.some((q) => q.includes("Chanel")));
});

test("sanitizeSnapshot clamps invalid LLM numbers", () => {
  const fallback = buildMarketWatchSnapshot({
    assetClass: "Luxury Bags",
    brand: "Chanel",
    model: "Classic Flap",
  });
  const out = sanitizeSnapshot(
    {
      trendPoints: [{ month: "2026-01", medianPrice: "4500" }],
      recentSales: [
        {
          price: "4400",
          platform: "eBay",
          condition: "Very good",
          daysToSell: "12",
        },
      ],
      demandMovement: "rising",
      avgDaysToSell: "18",
      bestPlatform: "eBay",
      suggestedListingPrice: "4600",
      buyBelowPrice: "5000",
      expectedMarginPct: "12",
      analyticsNote: "Web sourced.",
    },
    fallback,
  );
  assert.equal(out.suggestedListingPrice, 4600);
  assert.equal(out.buyBelowPrice, 4600);
  assert.equal(out.avgDaysToSell, 18);
});

test("searchWeb returns [] when Tavily is not configured", async () => {
  const prev = process.env.TAVILY_API_KEY;
  delete process.env.TAVILY_API_KEY;
  try {
    assert.equal(isWebSearchConfigured(), false);
    const hits = await searchWeb(["Chanel Classic Flap sold price"]);
    assert.deepEqual(hits, []);
  } finally {
    if (prev) process.env.TAVILY_API_KEY = prev;
  }
});
