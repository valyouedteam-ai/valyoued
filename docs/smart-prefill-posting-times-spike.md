# Spike: Smart prefilling and posting-time guidance

Ship only after valuation wizard / post-submit flows stabilize (roadmap Phase 4). This note frames architecture and ethics so implementation does not creep into scraped personal data or unverifiable claims.

## Smart prefilling

**Goal:** Reduce empty fields when someone types brand, model, or year without calling heavy models on every keystroke.

**Architecture sketch:**

- **Debounced client** (`300–600 ms`) keyed by `{ assetTypeId, brand?, model?, year? }`.
- **Server endpoint** (or reuse comparables tooling) returns a sparse “suggestion object” merged only into wizard fields that are still empty so we never overwrite user input.
- **Cache:** CDN-friendly `ETag` or short TTL edge cache plus in-memory LRU in the API for hot keys.
- **Budget:** Cap lookups per valuation session and per IP/user to mirror existing LLM or search budgets.

**Risks:** Hallucinated specs (movement, authenticity). Prefer “suggested fill” badges and one-click accept, not silent autofill into required legal fields without review.

## Posting-time heuristics (“when shoppers are active”)

**Goal:** Everyday / Professional-only tips that improve listing traction without implying hidden surveillance data.

**Ethical proxies (examples):**

- **Category defaults:** Broad marketplace docs (seller academies), public holiday calendars, weekend vs weekday patterns summarized at marketplace level, not per-listing watchers.
- **Timezone:** Interpret “evening shopper” relative to seller region (`currentRegion`), not purchaser IP harvesting.
- **Honest labeling:** Surface as gentle ranges (“often busier weekday evenings UTC±0”) sourced from aggregated public guidance, never “37 people viewed bags at 21:03.”

**Out of scope without a strategy:** Scraping competitor listing metrics, requiring OAuth to buyer accounts, or any signal that resembles individual tracking.

## Research checklist before build

Vestiaire vs The RealReal vs Christie’s (handbags); Chrono24 vs retail listings (watches): which facets move comparable confidence enough to justify new fields?

When that list is prioritized, propose a phased rollout: glossary + UX first, enrichment service second.
