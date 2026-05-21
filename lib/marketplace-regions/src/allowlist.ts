import type { ListingPlatformSlug } from "./platforms.js";
import { LISTING_PLATFORM_SLUGS } from "./platforms.js";

/**
 * Regions that appear in valuations ([`regions.ts`] on the API). Values are posting targets
 * consistent with PLATFORM_URL coverage in the app (UK AutoTrader only for UK sellers, etc.).
 */
const GLOBAL_RESALE_CORE: ListingPlatformSlug[] = [
  "facebook-marketplace",
  "ebay",
  "depop",
  "vinted",
  "vestiaire-collective",
  "chrono24",
];

/** US-style local classifieds footprint (also used for CA/MX Craigslist sections). */
const US_AND_CRAIGSLIST: ListingPlatformSlug[] = [...GLOBAL_RESALE_CORE, "craigslist"];

/** UK-only portals in this product (posting URLs are UK-specific today). */
const UK_ONLY_EXTRA: ListingPlatformSlug[] = ["gumtree", "rightmove", "autotrader"];

const REGION_TO_PLATFORMS: Record<string, ListingPlatformSlug[]> = {
  "United Kingdom": [...GLOBAL_RESALE_CORE, ...UK_ONLY_EXTRA],
  "United States": US_AND_CRAIGSLIST,
  Canada: US_AND_CRAIGSLIST,
  Mexico: US_AND_CRAIGSLIST,
  Brazil: GLOBAL_RESALE_CORE,
  /** EU members: Gumtree posting URL targets the UK today, so omit. Craigslist is not primary. */
  "European Union": GLOBAL_RESALE_CORE,
  Germany: GLOBAL_RESALE_CORE,
  France: GLOBAL_RESALE_CORE,
  Italy: GLOBAL_RESALE_CORE,
  Spain: GLOBAL_RESALE_CORE,
  Switzerland: GLOBAL_RESALE_CORE,
  Japan: GLOBAL_RESALE_CORE,
  /** International hubs without UK-only portals below. */
  "Hong Kong": GLOBAL_RESALE_CORE,
  Singapore: GLOBAL_RESALE_CORE,
  UAE: GLOBAL_RESALE_CORE,
  Australia: GLOBAL_RESALE_CORE,
  "New Zealand": GLOBAL_RESALE_CORE,
  China: GLOBAL_RESALE_CORE,
  "South Korea": GLOBAL_RESALE_CORE,
  India: GLOBAL_RESALE_CORE,
  "South Africa": GLOBAL_RESALE_CORE,
};

const DEFAULT_FALLBACK: ListingPlatformSlug[] = GLOBAL_RESALE_CORE;

/**
 * Platforms we suggest for generating a posting draft for a seller in `regionName`.
 * Unknown regions fall back to a global resale set without UK-only slugs.
 */
export function allowedPlatformsForRegion(regionName: string | undefined | null): ListingPlatformSlug[] {
  const key = typeof regionName === "string" ? regionName.trim() : "";
  const list =
    key && Object.prototype.hasOwnProperty.call(REGION_TO_PLATFORMS, key)
      ? REGION_TO_PLATFORMS[key]!
      : DEFAULT_FALLBACK;
  return [...list];
}

/**
 * Narrow an arbitrary slug list to platforms we know plus allowlist intersection.
 */
export function filterPlatformsByRegion(regionName: string | undefined | null, slugs: string[]): ListingPlatformSlug[] {
  const allow = new Set(allowedPlatformsForRegion(regionName));
  const out: ListingPlatformSlug[] = [];
  for (const s of slugs) {
    if (LISTING_PLATFORM_SLUGS.includes(s as ListingPlatformSlug) && allow.has(s as ListingPlatformSlug)) {
      out.push(s as ListingPlatformSlug);
    }
  }
  return out;
}
