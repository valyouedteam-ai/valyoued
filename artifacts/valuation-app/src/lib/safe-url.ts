/** Allow only http(s) URLs for user-facing links (comparables, citations, etc.). */
export function safeHttpUrl(raw: string | undefined | null): string | undefined {
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
