# Marketplaces by seller region

**Last reviewed:** 2026-05-21

This note tracks how posting drafts narrow marketplaces to regions that align with posting URLs shipped in [`artifacts/valuation-app/src/lib/platforms.ts`](artifacts/valuation-app/src/lib/platforms.ts).

## Sources of truth

- Allowlist helper: `@workspace/marketplace-regions` (`allowedPlatformsForRegion`).
- Regions list: [`artifacts/api-server/src/lib/regions.ts`](artifacts/api-server/src/lib/regions.ts).
- UI + API reuse the same allowlist (dialog filters selections; `POST /listings` validates).

## Assumptions and caveats

- **Manual curation.** There is no single public API enumerating viable marketplaces per country. Change the matrix when onboarding new posting URLs or local sites.
- **AutoTrader.** The bundled URL targets the UK catalogue. Sellers outside the UK do not receive this slug unless we add region-specific postings.
- **Gumtree.** The bundled URL targets the UK flow. Sellers outside the UK are not offered Gumtree until a region-correct compose URL ships.
- **eBay taxonomy.** Mandatory item specifics are category-driven when publishing to eBay. Draft text still warns sellers to finish specifics onsite.
- **Craigslist.** Offered primarily for sellers mapped to markets with habitual Craigslist use (currently United States/Canada/Mexico). Adjust if UX research disagrees.

## Review cadence

Revisit quarterly or after any marketplace changes shipping fees, onboarding requirements, or geoblocking that affect seller flows.
