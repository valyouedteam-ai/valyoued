import type { Comparable } from "@workspace/api-zod";

const MATCH_TIERS = ["strong", "moderate", "broadAnalogue"] as const;

const TRANSACTION_GUESSES = ["sold_estimate", "asking_price", "unknown"] as const;

/** @internal */
export function coerceMatchTier(raw: unknown): (typeof MATCH_TIERS)[number] | undefined {
  return MATCH_TIERS.includes(raw as (typeof MATCH_TIERS)[number]) ? (raw as (typeof MATCH_TIERS)[number]) : undefined;
}

/** @internal */
export function coerceTransactionTypeGuess(
  raw: unknown,
): (typeof TRANSACTION_GUESSES)[number] | undefined {
  return TRANSACTION_GUESSES.includes(raw as (typeof TRANSACTION_GUESSES)[number])
    ? (raw as (typeof TRANSACTION_GUESSES)[number])
    : undefined;
}

function truncateField(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function finalizeImageUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  if (!t) return undefined;
  try {
    const u = new URL(t);
    if (u.protocol !== "https:") return undefined;
    return u.href;
  } catch {
    return undefined;
  }
}

export function safeComparableUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  if (!t) return undefined;
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return undefined;
    return u.href;
  } catch {
    return undefined;
  }
}

/**
 * True when the URL is almost certainly a marketplace search/browse hub rather than a
 * specific lot, item, or article (which we want for comparable evidence).
 */
export function comparableUrlLooksLikeSearchOrBrowse(href: string): boolean {
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return true;
  }

  const host = u.hostname.toLowerCase();
  const path = u.pathname.toLowerCase();

  if (host === "google.com" || host.endsWith(".google.com")) {
    return path === "/search" || path.startsWith("/search");
  }
  if (host.includes("bing.com") && path.includes("search")) return true;

  if (host.includes("ebay.")) {
    if (path.includes("/sch/")) return true;
    if (path.startsWith("/b/")) return true;
  }

  if (host.includes("facebook.com") && path.includes("/marketplace/search")) return true;

  if (host.includes("chrono24.com") && path.includes("/search/")) return true;

  if (host.includes("depop.com") && path.includes("/search")) return true;

  if (host.includes("vestiairecollective.com") && path.includes("/search")) return true;

  if (host.includes("gumtree.com") && path.includes("/search")) return true;

  if (host.includes("craigslist.org") && path.includes("/search/")) return true;

  if (host.includes("watchcharts.com") && path.includes("/search")) return true;

  if (host.includes("autotrader.co.uk") && path.includes("/cars") && u.searchParams.has("keywords")) return true;

  if (host.includes("vinted.") && path === "/catalog" && u.searchParams.has("search_text")) return true;

  if (host.includes("bringatrailer.com") && u.searchParams.has("s") && !path.includes("/listing/")) return true;

  if (host.includes("rightmove.co.uk") && path.includes("/property-for-sale/search")) return true;

  if (host.includes("zillow.com") && path.includes("/homes/") && path.includes("_rb")) return true;

  if (host.includes("amazon.") && path.startsWith("/s") && u.searchParams.has("k")) return true;

  return false;
}

function finalizeComparableUrl(raw: unknown): string | undefined {
  const s = safeComparableUrl(raw);
  if (!s) return undefined;
  if (comparableUrlLooksLikeSearchOrBrowse(s)) return undefined;
  return s;
}

/** Real URLs only (no search hubs), sale years normalized, newest-first for display. */
export function sanitizeComparables(comps: Comparable[] | undefined): Comparable[] {
  const list = Array.isArray(comps)
    ? comps.filter(
        (c): c is Comparable =>
          c != null && typeof c === "object" && !Array.isArray(c),
      )
    : [];
  const yNow = new Date().getFullYear();
  const normalized = list.map((c) => {
    const url = finalizeComparableUrl(c.url);
    const imageUrl = finalizeImageUrl(c.imageUrl);
    const matchTier = coerceMatchTier(c.matchTier);
    const transactionTypeGuess = coerceTransactionTypeGuess(c.transactionTypeGuess);
    const conditionCue =
      typeof c.conditionCue === "string" ? truncateField(c.conditionCue, 220) || undefined : undefined;
    const locationOrChannel =
      typeof c.locationOrChannel === "string" ? truncateField(c.locationOrChannel, 160) || undefined : undefined;
    const relevanceExplanation =
      typeof c.relevanceExplanation === "string" ? truncateField(c.relevanceExplanation, 360) || undefined : undefined;

    const loose = c as { price?: unknown; source?: unknown; description?: unknown };
    const parsedPrice =
      typeof loose.price === "number"
        ? loose.price
        : typeof loose.price === "string"
          ? Number(loose.price.replace(/,/g, "").trim())
          : NaN;
    const price = Number.isFinite(parsedPrice) && parsedPrice >= 0 ? Math.round(parsedPrice) : 0;

    const source =
      typeof loose.source === "string" && truncateField(loose.source, 160).trim().length > 0
        ? truncateField(loose.source, 160)!
        : "Comparable";
    const description =
      typeof loose.description === "string" && truncateField(loose.description, 560).trim().length > 0
        ? truncateField(loose.description, 560)!
        : "Similar market evidence";

    return {
      ...c,
      source,
      description,
      price,
      year:
        typeof c.year === "number" && Number.isFinite(c.year)
          ? Math.min(yNow + 1, Math.max(1990, Math.round(c.year)))
          : typeof c.year === "string" && /^\s*\d{4}\s*$/.test(c.year)
            ? Math.min(yNow + 1, Math.max(1990, Math.round(Number(c.year))))
            : yNow,
      url,
      imageUrl,
      matchTier,
      transactionTypeGuess,
      conditionCue,
      locationOrChannel,
      relevanceExplanation,
    };
  });
  normalized.sort((a, b) => b.year - a.year);
  return normalized;
}
