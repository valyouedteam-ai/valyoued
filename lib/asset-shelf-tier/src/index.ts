export type SellerTier = "everyday" | "luxury";

export type PortfolioShelf = "luxury" | "everyday" | "other";

/**
 * Collectibles / appreciation narrative — shown only when the seller picks the luxury track.
 */
const LUXURY_ONLY_IDS = new Set<string>([
  "luxury-watch",
  "fine-jewelry",
  "vintage-watch",
  "pocket-watch",
  "designer-handbag",
  "designer-accessories",
  "sneakers",
  "streetwear-apparel",
  "classic-car",
  "fine-art",
  "trading-cards",
  "wine-spirits",
  "vinyl-records",
  "rare-books",
  "musical-instrument",
  "designer-furniture",
  "antique",
  "premium-rug",
  "sports-memorabilia",
  "comic-books",
  "numismatics",
  "philately",
]);

/**
 * Mass-market / depreciating consumer goods — shown only on the everyday track.
 */
const EVERYDAY_ONLY_IDS = new Set<string>([
  "everyday-car",
  "smartphone",
  "laptop",
  "gaming-console",
  "camera",
  "tablet",
  "bicycle",
  "golf-equipment",
  "winter-sports",
  "camping-outdoor",
  "fitness-equipment",
  "rv-camper",
]);

function tierHintFromAttributes(attributes: string | undefined): SellerTier | null {
  if (typeof attributes !== "string") return null;
  if (/Tier:\s*Luxury/i.test(attributes)) return "luxury";
  if (/Tier:\s*Everyday/i.test(attributes)) return "everyday";
  return null;
}

export function assetTypeAllowedForSellerTier(assetTypeId: string, tier: SellerTier): boolean {
  if (LUXURY_ONLY_IDS.has(assetTypeId)) return tier === "luxury";
  if (EVERYDAY_ONLY_IDS.has(assetTypeId)) return tier === "everyday";
  return true;
}

export function portfolioShelfFromEstimate(attributes: string | undefined, assetTypeId: string): PortfolioShelf {
  const hint = tierHintFromAttributes(attributes);
  if (hint === "luxury") return "luxury";
  if (hint === "everyday") return "everyday";
  if (LUXURY_ONLY_IDS.has(assetTypeId)) return "luxury";
  if (EVERYDAY_ONLY_IDS.has(assetTypeId)) return "everyday";
  return "other";
}

export function readAttributesFromStoredResult(result: unknown): string | undefined {
  if (!result || typeof result !== "object") return undefined;
  const attrs = (result as { input?: { attributes?: unknown } }).input?.attributes;
  return typeof attrs === "string" ? attrs : undefined;
}
