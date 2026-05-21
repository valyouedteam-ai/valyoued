import type { Comparable } from "@workspace/api-zod";

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
  const list = Array.isArray(comps) ? [...comps] : [];
  const yNow = new Date().getFullYear();
  const normalized = list.map((c) => ({
    ...c,
    year:
      typeof c.year === "number" && Number.isFinite(c.year)
        ? Math.min(yNow + 1, Math.max(1990, Math.round(c.year)))
        : yNow,
    url: finalizeComparableUrl(c.url),
  }));
  normalized.sort((a, b) => b.year - a.year);
  return normalized;
}
