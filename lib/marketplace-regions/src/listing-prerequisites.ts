import type { ListingPlatformSlug } from "./platforms.js";

/**
 * Typical buyer-critical fields per platform (not legal compliance). eBay specifics are taxonomy-driven at publish time.
 */
export const PLATFORM_LISTING_PREREQUISITES: Record<ListingPlatformSlug, string> = {
  "facebook-marketplace":
    "Local pickup versus shipping, approximate area, honest wear, whether price is firm, and preferred contact method.",
  ebay: "Category-specific item specifics still need to be completed on eBay itself (colour, size, brand, condition grade). Mention returns postage and authenticity evidence where buyers expect it.",
  gumtree: "UK-local collection expectations, viewing welcome or not, and cash versus bank transfer preference.",
  craigslist: "Neighbourhood hint, scams warning tone is normal, cash-only wording if that is true, clear defects.",
  depop: "Measurements for apparel, hashtags in the vibe of the listing, hype or era callouts, courier method.",
  vinted:
    "Package size bracket awareness, garment measurements, flaws and wash wear, bundles policy if relevant.",
  "vestiaire-collective":
    "Provenance wording, originality, serial or date-code if you have them, completeness (dust bag, strap, receipts), authenticity evidence you can disclose.",
  autotrader:
    "Mileage, service history wording, MOT or regional inspection timing, tyres and brakes candour, two keys, modifications declared, realistic viewing slots.",
  chrono24:
    "Reference or calibre clarity, originality statement, polish or service touches, lug wear, completeness (papers, outer box), payment and shipping realism.",
  rightmove:
    "Tenure flavour, council tax band or local equivalent if you know it, EPC headline in UK terms plus room flow, schooling or transport mentions only if truthful from the valuation notes.",
};

export function prerequisitesBlockForPlatform(platform: ListingPlatformSlug): string {
  return PLATFORM_LISTING_PREREQUISITES[platform] ?? "";
}
