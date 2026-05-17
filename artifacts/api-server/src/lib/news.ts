import { XMLParser } from "fast-xml-parser";
import { logger } from "./logger";

export interface NewsArticle {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  snippet: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Search Google News RSS for a query. No API key required.
 * Returns up to `limit` articles, freshest first, restricted to the last `days` days.
 */
export async function searchNews(
  query: string,
  options: { limit?: number; days?: number; locale?: string } = {},
): Promise<NewsArticle[]> {
  const { limit = 6, days = 30, locale = "en-US" } = options;
  const [hl, country] = locale.includes("-") ? locale.split("-") : [locale, "US"];

  const q = `${query} when:${days}d`;
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${hl}&gl=${country}&ceid=${country}:${hl}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 ValYoued News Aggregator" },
    });
    clearTimeout(timer);

    if (!res.ok) {
      logger.warn({ status: res.status, query }, "News fetch non-200");
      return [];
    }
    const xml = await res.text();
    const parsed = parser.parse(xml);
    const items = parsed?.rss?.channel?.item ?? [];
    const list = Array.isArray(items) ? items : [items];

    return list.slice(0, limit).map((item: any) => {
      const sourceRaw = item?.source;
      const source =
        typeof sourceRaw === "string"
          ? sourceRaw
          : sourceRaw?.["#text"] ?? sourceRaw?.["@_url"] ?? "Unknown";
      return {
        title: stripHtml(String(item?.title ?? "")),
        source: String(source ?? "Unknown"),
        url: String(item?.link ?? ""),
        publishedAt: String(item?.pubDate ?? ""),
        snippet: stripHtml(String(item?.description ?? "")).slice(0, 280),
      };
    });
  } catch (err) {
    logger.warn({ err: (err as Error).message, query }, "News search failed");
    return [];
  }
}

/**
 * Build 2-3 search queries that surface news likely to move the value of THIS asset
 * for THIS seller's region. Keyed off asset type id with sensible fallbacks.
 */
export function buildNewsQueries(
  assetTypeId: string,
  assetTypeName: string,
  region: string,
): string[] {
  const base = `${assetTypeName} market ${region}`;
  switch (assetTypeId) {
    case "everyday-car":
    case "classic-car":
    case "motorcycle":
      return [
        `${region} petrol diesel prices`,
        `${region} EV electric vehicle legislation tax`,
        `${region} used car market ${assetTypeName === "Classic / Collector Car" ? "classic" : ""}`.trim(),
      ];
    case "residential-property":
      return [
        `${region} interest rates mortgage`,
        `${region} property market house prices`,
        `${region} stamp duty planning policy`,
      ];
    case "wine-spirits":
      return [
        `wine whisky tariffs ${region}`,
        `wine investment market 2026`,
        `${region} alcohol duty tax`,
      ];
    case "luxury-watch":
      return [
        `luxury watch market ${region} 2026`,
        `Rolex Patek pre-owned prices`,
        `${region} luxury goods import duty`,
      ];
    case "designer-handbag":
      return [
        `Hermes Chanel resale market ${region}`,
        `luxury handbag prices 2026`,
        `${region} import duty luxury goods`,
      ];
    case "fine-art":
      return [
        `art market auction ${region} 2026`,
        `contemporary art prices`,
        `${region} art import VAT`,
      ];
    case "trading-cards":
    case "sports-memorabilia":
      return [
        `${assetTypeName} market 2026`,
        `${region} collectibles auction`,
      ];
    case "smartphone":
    case "laptop":
    case "gaming-console":
    case "camera":
      return [
        `${assetTypeName} resale price 2026`,
        `${region} second hand electronics market`,
        `tech tariffs import duty 2026`,
      ];
    default:
      return [base, `${region} resale market 2026`];
  }
}
