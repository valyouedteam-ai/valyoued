/** Platform slugs supported by POST /listings (OpenAPI enum). */
export const LISTING_PLATFORM_SLUGS = [
  "facebook-marketplace",
  "ebay",
  "gumtree",
  "craigslist",
  "depop",
  "vinted",
  "vestiaire-collective",
  "autotrader",
  "chrono24",
  "rightmove",
] as const;

export type ListingPlatformSlug = (typeof LISTING_PLATFORM_SLUGS)[number];

export const LISTING_PLATFORM_SLUG_SET = new Set<string>(LISTING_PLATFORM_SLUGS);

export function isListingPlatformSlug(v: string): v is ListingPlatformSlug {
  return LISTING_PLATFORM_SLUG_SET.has(v);
}
