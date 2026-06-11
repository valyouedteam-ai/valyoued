import { mergePortfolioHref } from "@/context/PortfolioWorkspaceContext";
import type { HomeBucketKey } from "@/lib/home-buckets";

const BUCKET_ASSET_HINT: Partial<Record<HomeBucketKey, { tier: "luxury" | "everyday"; assetTypeId?: string }>> = {
  luxuryBags: { tier: "luxury", assetTypeId: "designer-handbag" },
  jewellery: { tier: "luxury", assetTypeId: "fine-jewelry" },
  cars: { tier: "everyday", assetTypeId: "car" },
  electronics: { tier: "everyday", assetTypeId: "smartphone" },
  clothing: { tier: "luxury", assetTypeId: "sneakers" },
  collectibles: { tier: "luxury", assetTypeId: "trading-cards" },
};

export function buildEstimateNewHref(
  portfolioQuerySuffix: string,
  bucket?: HomeBucketKey,
): string {
  const params = new URLSearchParams();
  if (portfolioQuerySuffix.startsWith("?")) {
    const existing = new URLSearchParams(portfolioQuerySuffix.slice(1));
    existing.forEach((v, k) => params.set(k, v));
  }
  if (bucket) {
    params.set("bucket", bucket);
    const hint = BUCKET_ASSET_HINT[bucket];
    if (hint?.tier) params.set("tier", hint.tier);
    if (hint?.assetTypeId) params.set("assetType", hint.assetTypeId);
  }
  const qs = params.toString();
  return mergePortfolioHref(qs ? `/estimate/new?${qs}` : "/estimate/new", "");
}
