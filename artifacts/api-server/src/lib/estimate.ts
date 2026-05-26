import { defaultModel, getLlm } from "@workspace/llm";
import type { StoredValuationLineage } from "@workspace/db";
import type {
  EstimateInput,
  EstimateResult,
  AssetType,
  Comparable,
  MarketSignal,
  ArbitrageOption,
  ProInsights,
  EstimateReport,
  WorldEvent,
} from "@workspace/api-zod";
import { logger } from "./logger";
import { searchNews, buildNewsQueries, type NewsArticle } from "./news";
import { sanitizeComparables } from "./comparables";
import { fetchInternalArchiveContext } from "./internalArchiveSignals";
import { buildStoredLineage } from "./valuationLineage";

interface AICore {
  baselineLow: number;
  baselineMid: number;
  baselineHigh: number;
  comparables: Comparable[];
  marketSignals: MarketSignal[];
  worldEvents: WorldEvent[];
  arbitrage: ArbitrageOption[];
  report: EstimateReport;
  proInsights: ProInsights;
}

function buildPrompt(
  input: EstimateInput,
  assetType: AssetType,
  currency: string,
  newsArticles: NewsArticle[],
  internalArchiveBlock?: string,
): string {
  const extras = input.extraFields
    ? Object.entries(input.extraFields)
        .filter(([, v]) => v && String(v).trim() !== "")
        .map(([k, v]) => `  - ${k}: ${v}`)
        .join("\n")
    : "(none)";

  const arbitrageInstruction = assetType.internationallyTradeable
    ? `Provide 4-6 international arbitrage rows (different countries / marketplaces) with realistic shipping costs (INCLUDING insured-courier insurance for high-value items), marketplace fees, and import duties / VAT for this asset class. The estimatedShipping figure MUST bundle in insurance for the declared value, and the demandNote MUST briefly call out the most expensive friction (such as "20% EU import VAT" or "1.5% insured-courier"). Include the seller's current region as one row. Mark exactly one row recommended:true (the highest netToSeller).`
    : `This asset is NOT practical to ship internationally (such as real estate, everyday cars, large furniture). Return arbitrage as exactly ONE row covering the LOCAL market only (region = the seller's region, with the most likely local marketplace). Set recommended:true on that row. Do not invent international markets.`;

  const newsBlock =
    newsArticles.length > 0
      ? newsArticles
          .map(
            (a, i) =>
              `[${i + 1}] ${a.title}\n    source: ${a.source} (${a.publishedAt})\n    url: ${a.url}\n    snippet: ${a.snippet}`,
          )
          .join("\n")
      : "(no live articles available; fall back to your training knowledge but mark events with sentiment:neutral if uncertain)";

  const internalBlock =
    internalArchiveBlock && internalArchiveBlock.trim() !== ""
      ? `\n\nINTERNAL VALYOUED ARCHIVE (weak directional context only; anonymized recent similar valuations from this platform, not verified third-party transactions):\n${internalArchiveBlock.trim()}\n`
      : "";

  return `You are ValYoued, a senior multi-asset appraiser. Estimate the resale value of an item based on the data below. Use your knowledge of recent (last 24 months) public sales, auction results, and marketplace listings.

Asset category: ${assetType.name}
Internationally tradeable: ${assetType.internationallyTradeable}
Title: ${input.title}
Brand / maker: ${input.brand ?? "n/a"}
Model: ${input.model ?? "n/a"}
Year: ${input.year ?? "n/a"}
Condition (1-10): ${input.condition}
Original purchase price (in ${currency}): ${input.purchasePrice ?? "n/a"}
Seller's current region: ${input.currentRegion}
All prices in your output MUST be in: ${currency}
Asset-specific details:
${extras}
Free-form notes: ${input.attributes ?? "n/a"}

VALUATION DIRECTION: read carefully:
Everyday-category items (cars, electronics, furniture, ordinary home goods) usually price off
recent comparable resale or asking levels; adjustedMid should follow those comps closely and respect
purchase price as context unless the evidence clearly supports stepping above it.
Luxury / collectible framing (tier hint may flag this) spans watches, marquee bags, vintages,
classic trims, sneakers, comics, trading cards, art, and similarly thin markets where scarcity or
auction records matter. Anchor to realized sales and credible asks instead of labeling direction.
Examples include discontinued Mini Cooper trims, vintage Rolex/Patek/Omega, first-generation Hermès,
limited-run sneakers, rare wine vintages, classic cars, comic books, trading cards, and art.
Use the asset class, brand, model, year, condition, and free-form notes (which may include
a tier hint like "Luxury / Collectible") to decide.

Hard rule for going ABOVE the original purchase price:
You may set adjustedMid above purchase price ONLY when at least TWO of the comparables you
return are recent sales above purchase price AND at least one marketSignals row has a
positive impact (>1.0) supported by a concrete reason (scarcity, discontinued status,
auction record, cult following). If those conditions are not met, keep adjustedMid at or
below the purchase price even for items the user labelled "Luxury / Collectible". Do not
inflate values on a hunch; let the comparables drive the direction.

LIVE NEWS HEADLINES (last 30 days, fetched moments ago; use these as the PRIMARY source for the World Events section):
${newsBlock}${internalBlock}

Return STRICT JSON ONLY (no prose, no markdown) matching this TypeScript type. ALL prices below in ${currency}:

{
  "baselineLow": number,        // conservative resale value
  "baselineMid": number,        // most likely resale value
  "baselineHigh": number,       // optimistic resale value
  "comparables": Array<{        // 3-5 realistic comparable SALES or firm asks (prioritize sold/completed transactions)
    "source": string,           // e.g. eBay, Chrono24, Bring a Trailer, Facebook Marketplace, auction house name
    "description": string,      // what sold, condition nuance, lot notes (keep short)
    "price": number,            // in ${currency}
    "year": number,             // CALENDAR YEAR of that sale or listing (NOT model year unless the transaction was in that year)
    "url"?: string,              // Permalink to a specific sale evidence page ONLY: eBay /itm/ item, Bring a Trailer /listing/, Chrono24 offer, auction PDF, or news article quoting the sale. OMIT if unsure. NEVER invent URLs.
    "conditionCue"?: string,     // one short phrase on how condition differs from seller item (better/worse, missing accessory, boxed, etc.)
    "locationOrChannel"?: string, // region/channel shorthand (London consignment, US auction pit, BAT, Facebook local)
    "transactionTypeGuess"?: "sold_estimate" | "asking_price" | "unknown",
    "relevanceExplanation"?: string, // ONE sentence tying this comp to TITLE/BRAND/YEAR/Seller notes/constraints explicitly
    "matchTier"?: "strong" | "moderate" | "broadAnalogue",
    "imageUrl"?: string           // OPTIONAL: only HTTPS URL of a thumbnail that already exists on that evidence page/host; NEVER guess or hallucinate URLs
  }>,
  "marketSignals": Array<{      // 3-5 current market factors
    "label": string,
    "value": string,
    "impact": number,           // multiplicative, 0.85-1.20 (1.0 = neutral)
    "rationale": string
  }>,
  "worldEvents": Array<{        // 3-6 news-driven items affecting this asset's value
    "title": string,            // headline of the article you are referencing (rewrite to be punchy if needed)
    "summary": string,          // 1-2 sentences explaining how THIS specific article impacts the seller's asset & price
    "sentiment": "positive" | "negative" | "neutral",
    "scope": string,            // "Global" or specific region/country
    "source": string,           // outlet name from the news headlines list above
    "url": string,              // url from the news headlines list above
    "publishedAt": string       // pubDate from the news headlines list above
  }>,
  "arbitrage": Array<{
    "region": string,
    "marketplace": string,
    "estimatedSalePrice": number,    // in ${currency}
    "estimatedShipping": number,     // in ${currency}
    "estimatedFees": number,         // in ${currency}
    "estimatedDuties": number,       // in ${currency}
    "netToSeller": number,           // sale - shipping - fees - duties, in ${currency}
    "currency": "${currency}",
    "demandNote": string,
    "recommended": boolean
  }>,
  "report": {
    "headline": string,                 // 6-12 word valuation headline
    "summary": string,                  // 2-3 sentence plain-English summary
    "baselineNarrative": string,        // 2-3 sentences on baseline reasoning
    "marketNarrative": string,          // 2-3 sentences on market sentiment
    "arbitrageNarrative": string,       // 2-3 sentences on best market to sell in (or local-only if not tradeable)
    "worldEventsNarrative": string,     // 3-4 sentences tying the headlines above to THIS asset's price for THIS seller
    "finalNarrative": string            // 2-3 sentence closing recommendation
  },
  "proInsights": {
    "negotiationTactics": Array<{ "title": string, "detail": string }>,
    "talkingPoints": string[],
    "redFlags": string[],
    "optimalTiming": string,
    "listingTips": string[],
    "walkAwayPrice": number,    // in ${currency}
    "anchorPrice": number       // in ${currency}
  }
}

Rules:
- ${arbitrageInstruction}
- COMPARABLES: recency & verifiability (critical):
  - Prefer sales from the **last 12–24 months**. At least **two** comparables should be from the last ~18 months when plausible for this asset class.
  - Do **not** lean on ancient sales (e.g. 2010s or earlier) as primary anchors unless the asset is extremely rare and you explicitly say so in the description. If you must cite an older sale, still prioritize newer comps first in the array.
  - Include **Facebook Marketplace** as a plausible source when the asset commonly trades locally (general merchandise, vehicles, furniture, electronics, many collectibles). Name the source accurately (e.g. "Facebook Marketplace", "eBay sold", "Bring a Trailer").
  - **url** field (strict):
    - Must be a **permalink** to that specific sale or lot: e.g. eBay **"/itm/"** item pages, Bring a Trailer **"/listing/"** (or equivalent auction URL), Chrono24 offer page, auction house lot page, or a reputable article that states the realized price with this URL.
    - **Never** use marketplace **search or browse** URLs: no eBay **"/sch/"** search results, no **"?_nkw="** keyword-only hubs, no Google **"/search"**, no **"facebook.com/.../marketplace/search"**, no generic category browse pages. If you only have a search URL, **omit url entirely** rather than paste it.
    - Never use placeholder or fabricated links.
  - **Trust metadata (required mindset)**:
    - Every comparable SHOULD include relevanceExplanation tying it explicitly to TITLE, CONDITION numeric score, ATTRIBUTE notes or tier hints the seller gave.
    - Use matchTier: strong only when condition/year band/category clearly align with the seller inputs; moderate for close substitutes; broadAnalogue when only directionally informative.
    - transactionTypeGuess: sold_estimate when clearly a realised sale/hammer/market-complete evidence; asking_price when plainly an active listing; unknown when unclear.
    - conditionCue summarizes the biggest difference versus the seller stated condition or completeness.
    - imageUrl only when copying a credible existing HTTPS thumbnail from that evidence ecosystem; NEVER fabricate hosts or paths (often omit entirely).
- Never wrap report copy or pro insight strings in quotation marks; use plain prose only (no leading/trailing " characters).
- World events MUST be GROUNDED in the LIVE NEWS HEADLINES above. Pick the 3-6 most relevant articles, copy their source/url/publishedAt verbatim, and explain in 1-2 sentences how each ONE specifically moves the price of THIS asset for THIS seller. Do NOT invent URLs.
- If none of the live articles are relevant (rare), you may add ONE training-knowledge entry with source:"General market context" and url:"". All other entries must come from the live list.
- The worldEventsNarrative should synthesise across the events you cite; keep it practical for the seller and tie each point to price impact.
- All prices in ${currency} as integers (no decimals). Use the currency naturally for the seller's market.
- Be realistic; if it's a mass-market item with low resale value, say so.
- Output JSON only.`;
}

function extractJson(text: string): string {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) return text.slice(start, end + 1);
  return text;
}

async function gatherNews(
  assetType: AssetType,
  region: string,
): Promise<NewsArticle[]> {
  const queries = buildNewsQueries(assetType.id, assetType.name, region);
  const batches = await Promise.all(
    queries.map((q) => searchNews(q, { limit: 4, days: 45 })),
  );
  // Flatten + dedupe by URL, keep up to 12 freshest
  const seen = new Set<string>();
  const articles: NewsArticle[] = [];
  for (const batch of batches) {
    for (const a of batch) {
      if (!a.url || seen.has(a.url)) continue;
      seen.add(a.url);
      articles.push(a);
    }
  }
  return articles.slice(0, 12);
}

async function callAI(prompt: string): Promise<AICore> {
  const llm = getLlm();
  const text = await llm.complete({
    model: defaultModel(),
    maxTokens: 6000,
    messages: [{ role: "user", content: prompt }],
  });
  const json = extractJson(text);
  return JSON.parse(json) as AICore;
}

function fallbackCore(
  input: EstimateInput,
  assetType: AssetType,
  currency: string,
): AICore {
  const base = (input.purchasePrice ?? 1500) * (0.5 + (input.condition / 10) * 0.6);
  const mid = Math.max(50, Math.round(base));
  const low = Math.round(mid * 0.82);
  const high = Math.round(mid * 1.18);
  const region = input.currentRegion;
  const arbitrage: ArbitrageOption[] = assetType.internationallyTradeable
    ? [
        { region, marketplace: "Local marketplace", estimatedSalePrice: mid, estimatedShipping: 0, estimatedFees: Math.round(mid * 0.1), estimatedDuties: 0, netToSeller: Math.round(mid * 0.9), currency, demandNote: "Home market, fastest sale.", recommended: true },
        { region: "United Kingdom", marketplace: "eBay UK", estimatedSalePrice: Math.round(mid * 1.05), estimatedShipping: 60, estimatedFees: Math.round(mid * 0.12), estimatedDuties: 0, netToSeller: Math.round(mid * 0.88), currency, demandNote: "Solid demand, higher fees.", recommended: false },
        { region: "Japan", marketplace: "Yahoo Auctions Japan", estimatedSalePrice: Math.round(mid * 1.1), estimatedShipping: 90, estimatedFees: Math.round(mid * 0.1), estimatedDuties: Math.round(mid * 0.08), netToSeller: Math.round(mid * 0.86), currency, demandNote: "Premiums for pristine condition.", recommended: false },
      ]
    : [
        { region, marketplace: "Local marketplace", estimatedSalePrice: mid, estimatedShipping: 0, estimatedFees: Math.round(mid * 0.05), estimatedDuties: 0, netToSeller: Math.round(mid * 0.95), currency, demandNote: "This asset is best sold locally.", recommended: true },
      ];

  return {
    baselineLow: low,
    baselineMid: mid,
    baselineHigh: high,
    comparables: [
      {
        source: "eBay",
        description: `Similar ${assetType.name} sold recently`,
        price: mid,
        year: new Date().getFullYear(),
        relevanceExplanation: `Bands near your condition score inside this category for ${region}.`,
        matchTier: "moderate",
        transactionTypeGuess: "sold_estimate",
        conditionCue: `Typical wear you described at condition ${input.condition}/10.`,
        locationOrChannel: region,
      },
      {
        source: "Marketplace",
        description: "Comparable listing in good condition",
        price: Math.round(mid * 1.05),
        year: new Date().getFullYear(),
        relevanceExplanation: "Acts as optimistic ceiling versus your baseline when demand is upbeat.",
        matchTier: "broadAnalogue",
        transactionTypeGuess: "asking_price",
      },
      {
        source: "Auction house",
        description: "Recent hammer price",
        price: Math.round(mid * 0.95),
        year: new Date().getFullYear() - 1,
        relevanceExplanation: "Anchors cautious buyers when liquidity thins versus retail channels.",
        matchTier: "strong",
        transactionTypeGuess: "sold_estimate",
      },
    ],
    marketSignals: [
      { label: "Category demand", value: "Stable", impact: 1.0, rationale: "Demand is steady; no major catalysts." },
      { label: "Currency", value: "Neutral", impact: 1.0, rationale: "Local currency broadly stable." },
    ],
    worldEvents: [
      { title: "Live news unavailable", summary: "We could not pull live news context for this asset right now.", sentiment: "neutral", scope: "Global" },
    ],
    arbitrage,
    report: {
      headline: `${assetType.name} valued around ${currency} ${mid.toLocaleString()}`,
      summary: "This is a heuristic estimate based on your inputs while live market enrichment is unavailable.",
      baselineNarrative: "Baseline derived from your stated condition and purchase price.",
      marketNarrative: "No live signals available; assuming neutral market.",
      arbitrageNarrative: assetType.internationallyTradeable
        ? "Selling locally usually nets the most after fees and shipping."
        : "This asset is best sold locally.",
      worldEventsNarrative: "Live news feed unavailable. Try again shortly for a fuller report with headlines attached.",
      finalNarrative: "Try again shortly for a refreshed valuation with full market context.",
    },
    proInsights: {
      negotiationTactics: [
        { title: "Anchor high", detail: `Open at ${currency} ${high.toLocaleString()} to leave room.` },
        { title: "Bundle accessories", detail: "Original packaging and paperwork meaningfully increase price." },
      ],
      talkingPoints: ["Highlight condition", "Mention provenance"],
      redFlags: ["Buyers will cite missing accessories"],
      optimalTiming: "Q4 typically sees the strongest collector demand.",
      listingTips: ["Use natural light photos", "Include all serial numbers"],
      walkAwayPrice: low,
      anchorPrice: high,
    },
  };
}

export type GeneratedEstimatePayload = Omit<
  EstimateResult,
  "id" | "createdAt" | "valuationLineage" | "valuationOutcome" | "valuationFeedback"
>;

export async function generateEstimate(
  input: EstimateInput,
  assetType: AssetType,
  tier: "free" | "pro",
  /** When tier is Pro, Professional subscribers still flip this on to persist seller playbook (`proInsights`). */
  includeSellerPlaybook: boolean,
): Promise<{ estimate: GeneratedEstimatePayload; lineage: StoredValuationLineage }> {
  const currency = input.currency;

  const [newsArticles, archiveHit] = await Promise.all([
    gatherNews(assetType, input.currentRegion),
    fetchInternalArchiveContext({
      assetTypeId: assetType.id,
      title: input.title,
    }),
  ]);
  logger.info(
    {
      newsCount: newsArticles.length,
      archiveMatches: archiveHit?.matchCount ?? 0,
      region: input.currentRegion,
      asset: assetType.id,
    },
    "Context gathered for estimate",
  );

  const internalArchiveBlock = archiveHit?.promptBlock ?? undefined;
  const prompt = buildPrompt(input, assetType, currency, newsArticles, internalArchiveBlock);

  let structuredFallback = false;
  let core: AICore;
  try {
    core = await callAI(prompt);
  } catch (err) {
    logger.error({ err }, "Structured estimate generation failed; using heuristic fallback.");
    structuredFallback = true;
    core = fallbackCore(input, assetType, currency);
  }

  const lineage = buildStoredLineage({
    promptText: prompt,
    retrievalSnapshotId: archiveHit?.snapshotId ?? null,
    internalArchiveMatchCount: archiveHit?.matchCount ?? 0,
    newsArticleCount: newsArticles.length,
    structuredFallback,
  });

  const netMarketFactor =
    core.marketSignals.length > 0
      ? core.marketSignals.reduce((s, m) => s + (m.impact ?? 1), 0) / core.marketSignals.length
      : 1;

  const adjustedLow = Math.round(core.baselineLow * netMarketFactor);
  const adjustedMid = Math.round(core.baselineMid * netMarketFactor);
  const adjustedHigh = Math.round(core.baselineHigh * netMarketFactor);

  // For non-internationally-tradeable assets, force exactly one local row.
  let arbitrage = (core.arbitrage ?? []).map((a) => ({ ...a, currency }));
  if (!assetType.internationallyTradeable) {
    arbitrage = arbitrage.slice(0, 1).map((a) => ({ ...a, recommended: true }));
    if (arbitrage.length === 0) {
      arbitrage = [
        {
          region: input.currentRegion,
          marketplace: "Local marketplace",
          estimatedSalePrice: adjustedMid,
          estimatedShipping: 0,
          estimatedFees: Math.round(adjustedMid * 0.05),
          estimatedDuties: 0,
          netToSeller: Math.round(adjustedMid * 0.95),
          currency,
          demandNote: "Best sold locally.",
          recommended: true,
        },
      ];
    }
  } else {
    let best = arbitrage[0];
    for (const a of arbitrage) if (a.netToSeller > (best?.netToSeller ?? -Infinity)) best = a;
    arbitrage = arbitrage.map((a) => ({ ...a, recommended: a === best }));
  }
  // Everyday free users: omit international arbitrage; keep a single sensible local/regional comparison row.
  if (tier === "free" && assetType.internationallyTradeable && arbitrage.length > 1) {
    const localRow =
      arbitrage.find((a) => a.region === input.currentRegion) ??
      arbitrage.find((a) => a.recommended) ??
      arbitrage[0];
    arbitrage = localRow ? [{ ...localRow, recommended: true }] : arbitrage;
  }
  const bestArbitrageRegion = arbitrage.find((a) => a.recommended)?.region ?? input.currentRegion;

  const estimate: GeneratedEstimatePayload = {
    input,
    assetType,
    currency,
    baselineLow: Math.round(core.baselineLow),
    baselineMid: Math.round(core.baselineMid),
    baselineHigh: Math.round(core.baselineHigh),
    comparables: sanitizeComparables(core.comparables),
    marketSignals: core.marketSignals ?? [],
    worldEvents: core.worldEvents ?? [],
    netMarketFactor: Math.round(netMarketFactor * 1000) / 1000,
    adjustedLow,
    adjustedMid,
    adjustedHigh,
    arbitrage,
    bestArbitrageRegion,
    report: core.report,
    tier,
    ...(tier === "pro" && includeSellerPlaybook ? { proInsights: core.proInsights } : {}),
  };

  return { estimate, lineage };
}
