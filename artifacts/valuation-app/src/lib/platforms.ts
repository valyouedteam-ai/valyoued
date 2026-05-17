export const PLATFORM_LABEL: Record<string, string> = {
  "facebook-marketplace": "Facebook Marketplace",
  ebay: "eBay",
  gumtree: "Gumtree",
  craigslist: "Craigslist",
  depop: "Depop",
  vinted: "Vinted",
  "vestiaire-collective": "Vestiaire Collective",
  autotrader: "AutoTrader",
  chrono24: "Chrono24",
  watchcharts: "WatchCharts",
  "bring-a-trailer": "Bring a Trailer",
  rightmove: "Rightmove",
  zillow: "Zillow",
};

// Direct links to each marketplace's "post a listing" page so the user can
// jump from the AI-generated draft straight into the form on the actual site.
export const PLATFORM_URL: Record<string, string> = {
  "facebook-marketplace": "https://www.facebook.com/marketplace/create/item",
  ebay: "https://www.ebay.com/sl/sell",
  gumtree: "https://my.gumtree.com/postad",
  craigslist: "https://post.craigslist.org/",
  depop: "https://www.depop.com/sell/",
  vinted: "https://www.vinted.com/items/new",
  "vestiaire-collective": "https://www.vestiairecollective.com/sell-clothes-online/",
  autotrader: "https://www.autotrader.co.uk/sell-my-car",
  chrono24: "https://www.chrono24.com/offer/index.htm",
  watchcharts: "https://watchcharts.com/sell",
  "bring-a-trailer": "https://bringatrailer.com/auctions/submit/",
  rightmove: "https://www.rightmove.co.uk/sell-your-home.html",
  zillow: "https://www.zillow.com/sell/",
};

// Map a free-text marketplace name (as returned by the model) to one of our
// known PLATFORM_URL slugs. Uses word-boundary matching on a normalized
// (lowercased, punctuation-stripped) form so generic words like "marketplace"
// don't accidentally route the user to the wrong posting URL.
export function matchPlatformSlug(rawName: string): string | null {
  const n = ` ${rawName.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim()} `;
  // Order matters: more specific aliases first, generic ones last.
  const candidates: Array<[string, string[]]> = [
    ["chrono24", ["chrono24", "chrono 24"]],
    ["watchcharts", ["watchcharts", "watch charts"]],
    ["bring-a-trailer", ["bring a trailer", "bringatrailer"]],
    ["autotrader", ["autotrader", "auto trader"]],
    ["vestiaire-collective", ["vestiaire", "vestiaire collective"]],
    ["facebook-marketplace", ["facebook marketplace", "fb marketplace", "facebook"]],
    ["ebay", ["ebay"]],
    ["gumtree", ["gumtree"]],
    ["craigslist", ["craigslist"]],
    ["depop", ["depop"]],
    ["vinted", ["vinted"]],
    ["rightmove", ["rightmove"]],
    ["zillow", ["zillow"]],
  ];
  for (const [slug, needles] of candidates) {
    if (needles.some((needle) => n.includes(` ${needle} `))) return slug;
  }
  return null;
}

// Search-by-text URLs, used to deep-link comparables to live listings on each
// marketplace so users can see what's currently for sale on different sites.
export function platformSearchUrl(slug: string, query: string): string | null {
  const q = encodeURIComponent(query);
  switch (slug) {
    case "ebay":
      return `https://www.ebay.com/sch/i.html?_nkw=${q}`;
    case "chrono24":
      return `https://www.chrono24.com/search/index.htm?query=${q}`;
    case "watchcharts":
      return `https://watchcharts.com/search?q=${q}`;
    case "bring-a-trailer":
      return `https://bringatrailer.com/?s=${q}`;
    case "autotrader":
      return `https://www.autotrader.co.uk/cars/used?keywords=${q}`;
    case "vestiaire-collective":
      return `https://www.vestiairecollective.com/search/?q=${q}`;
    case "depop":
      return `https://www.depop.com/search/?q=${q}`;
    case "vinted":
      return `https://www.vinted.com/catalog?search_text=${q}`;
    case "facebook-marketplace":
      return `https://www.facebook.com/marketplace/search/?query=${q}`;
    case "gumtree":
      return `https://www.gumtree.com/search?search_keywords=${q}`;
    case "craigslist":
      return `https://www.craigslist.org/search/sss?query=${q}`;
    case "rightmove":
      return `https://www.rightmove.co.uk/property-for-sale/search.html?searchLocation=${q}`;
    case "zillow":
      return `https://www.zillow.com/homes/${q}_rb/`;
    default:
      return null;
  }
}

// Best-fit "find more like this" platforms for a given asset type name, used
// to add live-listing links to each comparable card on the report page.
export function platformsForAssetType(assetTypeName: string): string[] {
  const t = assetTypeName.toLowerCase();
  if (t.includes("watch"))
    return ["chrono24", "watchcharts", "ebay", "facebook-marketplace"];
  if (t.includes("car") || t.includes("vehicle") || t.includes("motorcycle"))
    return ["facebook-marketplace", "bring-a-trailer", "autotrader", "ebay"];
  if (t.includes("handbag") || t.includes("bag") || t.includes("luxury") || t.includes("fashion"))
    return ["vestiaire-collective", "ebay", "facebook-marketplace", "depop"];
  if (t.includes("clothing") || t.includes("sneaker") || t.includes("apparel"))
    return ["depop", "vinted", "ebay", "facebook-marketplace"];
  if (t.includes("real estate") || t.includes("property") || t.includes("home") || t.includes("house"))
    return ["zillow", "rightmove", "facebook-marketplace"];
  // Sensible default for "everything else" (electronics, art, collectibles, etc.)
  return ["ebay", "facebook-marketplace", "craigslist"];
}
