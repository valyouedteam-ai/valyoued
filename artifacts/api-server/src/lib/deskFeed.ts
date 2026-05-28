/** Curated illustrative feed for Professional desk (near-live placeholders until partner feeds ship). */

export type DeskFeedItem = {
  id: string;
  title: string;
  summary: string;
  source: string;
  url?: string;
  assetTypeSlugHints: string[];
  tone: "constructive" | "neutral" | "caution";
};

const LIBRARY: DeskFeedItem[] = [
  {
    id: "dc-watch-liquidity-1",
    title: "Watch liquidity remains tilted toward full sets",
    summary:
      "Dealers reporting stronger clearance when box, papers, and recent service intervals are spelled out upfront. Pieces without papers still trade but widen bid/ask spreads.",
    source: "ValYoued desk briefing",
    assetTypeSlugHints: ["rolex-watch", "omega-watch", "watch"],
    tone: "constructive",
  },
  {
    id: "dc-lux-bag-floor-2",
    title: "Handbag comps cluster around condition disclosures",
    summary:
      "Marketplace buyers continue to penalize undisclosed hardware wear. Listings that open with flaw photos converge faster toward ask.",
    source: "ValYoued desk briefing",
    assetTypeSlugHints: ["designer-handbag", "handbag", "luxury"],
    tone: "neutral",
  },
  {
    id: "dc-auto-seasonal-3",
    title: "Collector cars: listing cadence softening into summer service months",
    summary:
      "Auction-to-private spreads compress when transport and inspection slots back up. Sellers showing fresh inspections keep momentum.",
    source: "ValYoued desk briefing",
    assetTypeSlugHints: ["classic-car", "car", "everyday-car"],
    tone: "caution",
  },
  {
    id: "dc-tech-depreciation-4",
    title: "Mass-market electronics still reward bundle completeness",
    summary:
      "Ship-ready bundles (chargers, cases, transferrable warranties) continue to beat bare units on days-to-sale metrics.",
    source: "ValYoued desk briefing",
    assetTypeSlugHints: ["iphone", "laptop", "electronics"],
    tone: "neutral",
  },
];

function scoreItem(item: DeskFeedItem, hints: Set<string>): number {
  let s = 0;
  for (const h of item.assetTypeSlugHints) {
    if (hints.has(h)) s += 3;
  }
  return s;
}

export function buildCuratedDeskFeed(topAssetTypeNames: string[]): { items: DeskFeedItem[]; fetchedAt: string } {
  const hints = new Set(
    topAssetTypeNames
      .flatMap((n) => {
        const lower = n.toLowerCase();
        return [lower, ...lower.split(/[^a-z0-9]+/g).filter(Boolean)];
      })
      .slice(0, 40),
  );

  const ranked = [...LIBRARY].sort((a, b) => scoreItem(b, hints) - scoreItem(a, hints));
  const picked = ranked.slice(0, 5);
  return {
    items: picked,
    fetchedAt: new Date().toISOString(),
  };
}
