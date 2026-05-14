import {
  FX_TO_USD,
  mergeUsdMultipliers,
  usdMultipliersFromFrankfurterUsdBaseRates,
} from "@workspace/fx-usd";
import { logger } from "./logger";

export type FxRateSnapshot = {
  /** Multiply an amount in this currency by `rates[currency]` to approximate USD. */
  rates: Record<string, number>;
  source: "frankfurter" | "static";
  /** ECB publishing date when `source` is frankfurter */
  asOf: string | null;
  fetchedAt: string;
};

function envTruthy(key: string): boolean {
  const v = process.env[key]?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function cacheTtlMs(): number {
  const raw = process.env.FX_CACHE_TTL_MS?.trim();
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  if (Number.isFinite(n) && n >= 60_000) return n;
  return 6 * 60 * 60 * 1000;
}

const frankfurterUrl =
  process.env.FRANKFURTER_URL?.trim() || "https://api.frankfurter.app/v1/latest?from=USD";

let cached: FxRateSnapshot | null = null;
let cachedAtMs = 0;
let inflight: Promise<FxRateSnapshot> | null = null;

async function fetchFrankfurter(): Promise<{ rates: Record<string, number>; date: string } | null> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 10_000);
  try {
    const res = await fetch(frankfurterUrl, {
      signal: ac.signal,
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      logger.warn({ status: res.status, url: frankfurterUrl }, "Frankfurter FX HTTP error");
      return null;
    }
    const data = (await res.json()) as {
      rates?: Record<string, number>;
      date?: string;
    };
    if (!data.rates || typeof data.rates !== "object") {
      logger.warn("Frankfurter FX missing rates object");
      return null;
    }
    const date =
      typeof data.date === "string" && data.date.trim() !== "" ? data.date.trim() : "";
    return { rates: data.rates, date };
  } catch (err) {
    logger.warn({ err, url: frankfurterUrl }, "Frankfurter FX fetch failed");
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function refreshRates(): Promise<FxRateSnapshot> {
  const fetchedAt = new Date().toISOString();

  if (!envTruthy("FX_LIVE_ENABLED")) {
    const snap: FxRateSnapshot = {
      rates: { ...FX_TO_USD },
      source: "static",
      asOf: null,
      fetchedAt,
    };
    return snap;
  }

  const api = await fetchFrankfurter();
  if (!api) {
    return {
      rates: { ...FX_TO_USD },
      source: "static",
      asOf: null,
      fetchedAt,
    };
  }

  const livePart = usdMultipliersFromFrankfurterUsdBaseRates(api.rates);
  const merged = mergeUsdMultipliers(FX_TO_USD, livePart);

  return {
    rates: merged,
    source: "frankfurter",
    asOf: api.date || null,
    fetchedAt,
  };
}

/**
 * Cached USD multipliers for stats and `GET /fx/rates`. Uses Frankfurter (ECB) when
 * `FX_LIVE_ENABLED` is set; otherwise returns the static table.
 */
export async function getFxRateSnapshot(): Promise<FxRateSnapshot> {
  const now = Date.now();
  const ttl = cacheTtlMs();
  if (cached && now - cachedAtMs < ttl) {
    return cached;
  }
  if (inflight) {
    return inflight;
  }
  inflight = (async () => {
    const next = await refreshRates();
    cached = next;
    cachedAtMs = Date.now();
    return next;
  })();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}
