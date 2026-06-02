export type WebSearchHit = {
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string;
};

export type SearchWebOptions = {
  maxResultsPerQuery?: number;
  timeoutMs?: number;
};

const DEFAULT_MAX_RESULTS = 5;
const DEFAULT_TIMEOUT_MS = 8_000;

export function isWebSearchConfigured(): boolean {
  return Boolean(process.env.TAVILY_API_KEY?.trim());
}

function readSearchBudgetMs(): number {
  const raw = process.env.MARKET_WATCH_SEARCH_BUDGET_MS?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

function dedupeHits(hits: WebSearchHit[]): WebSearchHit[] {
  const seen = new Set<string>();
  const out: WebSearchHit[] = [];
  for (const hit of hits) {
    const key = hit.url.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(hit);
  }
  return out;
}

async function tavilySearch(query: string, maxResults: number, signal: AbortSignal): Promise<WebSearchHit[]> {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) return [];

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: maxResults,
      search_depth: "basic",
      include_answer: false,
    }),
    signal,
  });

  if (!res.ok) {
    throw new Error(`Tavily search failed (${res.status})`);
  }

  const body = (await res.json()) as {
    results?: Array<{ title?: string; url?: string; content?: string; published_date?: string }>;
  };

  return (body.results ?? [])
    .filter((r) => typeof r.url === "string" && r.url.trim() !== "")
    .map((r) => ({
      title: (r.title ?? r.url ?? "Result").trim(),
      url: r.url!.trim(),
      snippet: (r.content ?? "").trim().slice(0, 500),
      publishedAt: r.published_date?.trim() || undefined,
    }));
}

/**
 * Run up to 3 web search queries via Tavily. Returns [] when unconfigured or on timeout.
 */
export async function searchWeb(
  queries: string[],
  opts: SearchWebOptions = {},
): Promise<WebSearchHit[]> {
  if (!isWebSearchConfigured()) return [];

  const maxResults = opts.maxResultsPerQuery ?? DEFAULT_MAX_RESULTS;
  const timeoutMs = opts.timeoutMs ?? readSearchBudgetMs();
  const trimmed = queries.map((q) => q.trim()).filter(Boolean).slice(0, 3);
  if (!trimmed.length) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const batches = await Promise.all(
      trimmed.map((query) => tavilySearch(query, maxResults, controller.signal).catch(() => [])),
    );
    return dedupeHits(batches.flat()).slice(0, maxResults * trimmed.length);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
