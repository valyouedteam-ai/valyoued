import test from "node:test";
import assert from "node:assert/strict";
import { allowedPlatformsForRegion } from "./allowlist.js";
import { inferVehicleFuelHint, matchFuelDropdownOption } from "./vehicle-inference.js";
import { sellerTerminologyPromptLine } from "./seller-terminology.js";

test("UK allowlist keeps UK-only portals", () => {
  const uk = new Set(allowedPlatformsForRegion("United Kingdom"));
  assert.ok(uk.has("rightmove"));
  assert.ok(uk.has("autotrader"));
  assert.ok(uk.has("gumtree"));
});

test("United States excludes UK-only portals", () => {
  const us = new Set(allowedPlatformsForRegion("United States"));
  assert.ok(us.has("craigslist"));
  assert.equal(us.has("rightmove"), false);
  assert.equal(us.has("autotrader"), false);
  assert.equal(us.has("gumtree"), false);
});

test("Unknown region defaults to core global resale set without UK portals", () => {
  const s = new Set(allowedPlatformsForRegion("Moon"));
  assert.equal(s.has("gumtree"), false);
});

test("Tesla brand hints electric", () => {
  const h = inferVehicleFuelHint({ brand: "Tesla", model: "Model 3" });
  assert.equal(h?.canonical, "Electric");
});

test("TDI hints diesel match in localized options", () => {
  const h = inferVehicleFuelHint({ brand: "Volkswagen", model: "Golf TDI SE" });
  assert.equal(h?.canonical, "Diesel");
  const opt = matchFuelDropdownOption(h!.canonical!, ["Gas", "Diesel", "Hybrid", "Electric"]);
  assert.equal(opt, "Diesel");
  const petrol = matchFuelDropdownOption(h!.canonical!, ["Petrol", "Diesel", "Hybrid", "Electric"]);
  assert.equal(petrol, "Diesel");
});

test("sellerTerminology mentions MOT for UK", () => {
  assert.match(sellerTerminologyPromptLine("United Kingdom"), /MOT/);
});

test("sellerTerminology mentions freeway for United States", () => {
  assert.match(sellerTerminologyPromptLine("United States"), /freeway/i);
});
