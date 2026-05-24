/** UX buckets derived from persisted estimate `assetTypeName` strings. */
export type HomeBucketKey =
  | "jewellery"
  | "luxuryBags"
  | "cars"
  | "electronics"
  | "antiques"
  | "clothing"
  | "collectibles"
  | "other";

export const HOME_BUCKET_ORDER: HomeBucketKey[] = [
  "jewellery",
  "luxuryBags",
  "cars",
  "electronics",
  "antiques",
  "clothing",
  "collectibles",
  "other",
];

export const HOME_BUCKET_LABEL: Record<HomeBucketKey, string> = {
  jewellery: "Jewellery & watches",
  luxuryBags: "Luxury bags",
  cars: "Cars & vehicles",
  electronics: "Electronics & tech",
  antiques: "Antiques & décor",
  clothing: "Clothing & sneakers",
  collectibles: "Collectibles",
  other: "Other valuables",
};

/**
 * Lightweight keyword router; aligns with curator labels rather than taxonomy IDs so it survives API drift.
 */
export function bucketForAssetTypeName(name: string): HomeBucketKey {
  const n = name.toLowerCase();

  const bagSignals = /\b(bag|handbag|tote|clutch|herm[eè]s|chanel|louis\s*vuitton|\blv\b)\b/;
  const jewellerySignals =
    /\b(jewel|jewelry|jewellery|necklace|bracelet|earring|rolex|omega|cartier|watch|fine watch|gold chain|silver chain|diamond)\b/;
  const carSignals = /\b(car|vehicle|motorcycle|truck|rv|marine|boat|automotive|motor)\b/;
  const electronicSignals =
    /\b(phone|iphone|laptop|tablet|gaming|electronics|speaker|camera|cpu|ssd|computer|monitor|keyboard|soundbar|console)\b/;
  const antiqueSignals = /\b(antique|vintage|furniture|bronze|tapestry|rug|armchair|dresser|credenza|sofa)\b/;
  const clothingSignals = /\b(shirt|jacket|sneaker|streetwear|apparel|clothing|denim|hoodie)\b/;
  const collectibleSignals = /\b(card|coins|stamp|bobblehead|collector|nft|memorabilia|figurine|comic)\b/;

  if (bagSignals.test(n) || n.includes("handbag")) return "luxuryBags";
  if (jewellerySignals.test(n)) return "jewellery";
  if (carSignals.test(n)) return "cars";
  if (electronicSignals.test(n)) return "electronics";
  if (antiqueSignals.test(n) || /\b(sofa |chair |table )\b/i.test(` ${name} `)) return "antiques";
  if (clothingSignals.test(n)) return "clothing";
  if (collectibleSignals.test(n)) return "collectibles";
  return "other";
}

export function countItemsByBucket(
  assetTypeNames: readonly string[],
): Record<HomeBucketKey, number> {
  const out: Record<HomeBucketKey, number> = {
    jewellery: 0,
    luxuryBags: 0,
    cars: 0,
    electronics: 0,
    antiques: 0,
    clothing: 0,
    collectibles: 0,
    other: 0,
  };
  for (const name of assetTypeNames) {
    out[bucketForAssetTypeName(name)]++;
  }
  return out;
}
