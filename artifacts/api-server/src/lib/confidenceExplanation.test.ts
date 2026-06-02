import test from "node:test";
import assert from "node:assert/strict";
import { buildMonitorValueAlertContent, CONFIDENCE_WEIGHTS } from "./confidenceExplanation.js";
import type { PortfolioAnalytics } from "@workspace/api-zod";

const sampleAnalytics: PortfolioAnalytics = {
  confidenceScore: 72,
  fieldCompleteness: {
    pct: 85,
    completed: ["Title", "Brand", "Model", "Condition"],
    missing: ["Purchase Price", "Year"],
  },
  resalePotential: "moderate",
  actionRecommendation: "hold",
  valuationFreshness: "fresh",
  receiptStatus: "partial",
  confidenceBreakdown: {
    fieldCompleteness: 85,
    compQuality: 68,
    marketStability: 62,
  },
};

test("buildMonitorValueAlertContent explains confidence weights", () => {
  const out = buildMonitorValueAlertContent({
    title: "Sample vintage watch",
    assetTypeName: "Luxury watch",
    currency: "GBP",
    baselineMid: 4200,
    adjustedMid: 4536,
    analytics: sampleAnalytics,
    citationUrls: ["https://example.com/comp"],
    comparableCount: 4,
  });
  assert.ok(out.bodyPlain.includes("72/100"));
  assert.ok(out.bodyPlain.includes(`${CONFIDENCE_WEIGHTS.fieldCompleteness}%`));
  assert.ok(out.bodyPlain.includes("Input details"));
  assert.ok(out.bodyPlain.includes("Comparable quality"));
  assert.ok(out.bodyPlain.includes("https://example.com/comp"));
});

test("buildMonitorValueAlertContent includes uplift amounts", () => {
  const out = buildMonitorValueAlertContent({
    title: "Test item",
    assetTypeName: "Watch",
    currency: "USD",
    baselineMid: 1000,
    adjustedMid: 1080,
    analytics: sampleAnalytics,
  });
  assert.equal(out.upliftPct, 8);
  assert.ok(out.summaryLine.includes("8%"));
});
