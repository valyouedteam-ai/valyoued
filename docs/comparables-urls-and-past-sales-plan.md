# Comparables URLs and “Similar past sales” plan

This document records the agreed approach for comparable evidence links, marketplace deep links on estimate reports, and related API behavior. Use it as the reference when extending patterns or debugging URL issues.

## Goals

1. **Valuation app**: “Similar past sales” should prefer **sold-filtered** marketplace URLs where we can build them reliably (especially eBay `LH_Sold` / `LH_Complete` and the correct US vs UK host). Keep **live** keyword search as a separate, clearly labeled row. Avoid copy that implies everything is “live listings only”.
2. **API server**: Tighten LLM instructions so `comparables[].url` is **permalink-style** (item, lot, article), not search or browse hubs. **Post-process** model output to **drop** URLs that still look like search or browse.
3. **Tests**: Unit coverage for URL classification and sanitization so regressions are obvious.

## Valuation app

### Behavior

- **`platformComparableSearchUrl`** in [`artifacts/valuation-app/src/lib/platforms.ts`](../artifacts/valuation-app/src/lib/platforms.ts) takes `intent: "sold" | "live"` and optional **`PlatformComparableContext`** (`currency`, `sellerRegion`).
- **Sold**: only **eBay** gets a URL today: `/sch/i.html?_nkw=…&LH_Sold=1&LH_Complete=1` on `www.ebay.com` or `www.ebay.co.uk` (GBP or UK-ish region strings pick `.co.uk`). Other platform slugs return **`null`** for sold intent.
- **Live**: unchanged keyword search URLs per platform (delegates to existing live search builders).
- **`platformSearchUrl`** remains a thin wrapper: same as **live** intent for backward compatibility.

### Report UI

- [`artifacts/valuation-app/src/pages/estimates/[id].tsx`](../artifacts/valuation-app/src/pages/estimates/[id].tsx) uses `platformComparableSearchUrl` for comparable cards: a **sold** chip row and a separate **live** row, with copy and `data-testid` hooks as implemented there.

## API server

### Post-processing

- [`artifacts/api-server/src/lib/comparables.ts`](../artifacts/api-server/src/lib/comparables.ts) exports **`comparableUrlLooksLikeSearchOrBrowse`**, **`finalizeComparableUrl`**, and **`sanitizeComparables`**. Search/browse patterns include major marketplaces and hubs (eBay `/sch/` and `/b/`, Google/Bing search, Facebook Marketplace search, and others as coded).
- Comparable **`url`** is omitted when it fails `safeComparableUrl` or matches search/browse heuristics.

### LLM prompt

- [`artifacts/api-server/src/lib/estimate.ts`](../artifacts/api-server/src/lib/estimate.ts) instructs the model: **permalink only**, **never** paste search/browse URLs; **omit `url`** if only a search link exists.
- **Important for developers**: the prompt is a JavaScript **template literal**. Do not put Markdown code spans that use **backticks** inside that string without escaping. Use plain quotes in the prompt text (e.g. `"/sch/"`) or escaped backticks, or the file will fail to parse.

## Tests

- [`artifacts/api-server/src/lib/comparables.test.ts`](../artifacts/api-server/src/lib/comparables.test.ts) covers stripping bad URLs and `sanitizeComparables` behavior.
- Run: `pnpm --filter @workspace/api-server test`

## Manual checks (optional)

- Open a report that includes **eBay** in the platform list and confirm sold links use the expected **`.com` vs `.co.uk`** host and that sold filters behave as expected in your region.
