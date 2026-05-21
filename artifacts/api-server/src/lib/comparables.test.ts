import test from "node:test";
import assert from "node:assert/strict";
import { comparableUrlLooksLikeSearchOrBrowse, sanitizeComparables } from "./comparables.js";

test("strips eBay search hub URLs", () => {
  assert.equal(
    comparableUrlLooksLikeSearchOrBrowse("https://www.ebay.com/sch/i.html?_nkw=watch&_sop=12"),
    true,
  );
  assert.equal(comparableUrlLooksLikeSearchOrBrowse("https://www.ebay.co.uk/sch/i.html?_nkw=test"), true);
  assert.equal(
    comparableUrlLooksLikeSearchOrBrowse("https://www.ebay.com/itm/123456789012"),
    false,
  );
});

test("strips Google web search", () => {
  assert.equal(comparableUrlLooksLikeSearchOrBrowse("https://www.google.com/search?q=rolex"), true);
});

test("sanitizeComparables removes search URLs but keeps item permalinks", () => {
  const out = sanitizeComparables([
    {
      source: "eBay",
      description: "Test",
      price: 100,
      year: 2024,
      url: "https://www.ebay.com/sch/i.html?_nkw=test",
    },
    {
      source: "eBay",
      description: "Real",
      price: 200,
      year: 2024,
      url: "https://www.ebay.com/itm/12345",
    },
  ]);
  assert.equal(out[0].url, undefined);
  assert.equal(out[1].url, "https://www.ebay.com/itm/12345");
});
