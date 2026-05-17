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

/** Real URLs only, sale years normalized, newest-first for display. */
export function sanitizeComparables(comps: Comparable[] | undefined): Comparable[] {
  const list = Array.isArray(comps) ? [...comps] : [];
  const yNow = new Date().getFullYear();
  const normalized = list.map((c) => ({
    ...c,
    year:
      typeof c.year === "number" && Number.isFinite(c.year)
        ? Math.min(yNow + 1, Math.max(1990, Math.round(c.year)))
        : yNow,
    url: safeComparableUrl(c.url),
  }));
  normalized.sort((a, b) => b.year - a.year);
  return normalized;
}
