/**
 * Static FX hints for rough USD normalization across dashboards and aggregate stats.
 * Same table as the portfolio diversification chart; not for settlement or tax.
 */
export const FX_TO_USD: Readonly<Record<string, number>> = {
  USD: 1,
  GBP: 1.27,
  EUR: 1.08,
  CAD: 0.74,
  AUD: 0.66,
  JPY: 0.0064,
  CHF: 1.13,
  HKD: 0.128,
  SGD: 0.74,
  AED: 0.27,
  INR: 0.012,
  CNY: 0.14,
  NZD: 0.6,
  ZAR: 0.054,
};

/**
 * Frankfurter returns `rates` with USD base: units of foreign currency per 1 USD.
 * This map is the inverse: multiply an amount in `CCY` by `out[CCY]` to get USD.
 */
export function usdMultipliersFromFrankfurterUsdBaseRates(
  rates: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = { USD: 1 };
  for (const [ccy, unitsPerUsd] of Object.entries(rates)) {
    const C = ccy.trim().toUpperCase();
    if (C === "USD") continue;
    if (typeof unitsPerUsd === "number" && Number.isFinite(unitsPerUsd) && unitsPerUsd > 0) {
      out[C] = 1 / unitsPerUsd;
    }
  }
  return out;
}

/** Merge live ECB/Frankfurter multipliers over static hints (static fills missing CCYs e.g. AED). */
export function mergeUsdMultipliers(
  staticTable: Readonly<Record<string, number>>,
  liveOverrides: Readonly<Record<string, number>> | null | undefined,
): Record<string, number> {
  const out: Record<string, number> = { ...staticTable };
  if (!liveOverrides) return out;
  for (const [k, v] of Object.entries(liveOverrides)) {
    const c = k.trim().toUpperCase();
    if (typeof v === "number" && Number.isFinite(v) && v > 0) {
      out[c] = v;
    }
  }
  return out;
}

/**
 * @param multipliers optional map (multiply amount in `currency` to get USD). When omitted, uses
 *   {@link FX_TO_USD}. Unknown currencies fall back to the static table, then `1`.
 */
export function convertToUsdApprox(
  amount: number,
  currencyCode: string | null | undefined,
  multipliers?: Readonly<Record<string, number>> | null,
): number {
  if (!Number.isFinite(amount)) return 0;
  const c = (currencyCode ?? "USD").trim().toUpperCase();
  const table = multipliers ?? FX_TO_USD;
  const rate = table[c] ?? FX_TO_USD[c] ?? 1;
  return amount * rate;
}

/**
 * Inverse of {@link convertToUsdApprox} using the same multiplier table
 * (multiply amount in foreign CCY by rate to get USD).
 */
export function convertFromUsdApprox(
  amountUsd: number,
  currencyCode: string | null | undefined,
  multipliers?: Readonly<Record<string, number>> | null,
): number {
  if (!Number.isFinite(amountUsd)) return 0;
  const c = (currencyCode ?? "USD").trim().toUpperCase();
  if (c === "USD") return amountUsd;
  const table = multipliers ?? FX_TO_USD;
  const rate = table[c] ?? FX_TO_USD[c] ?? 1;
  if (!Number.isFinite(rate) || rate <= 0) return amountUsd;
  return amountUsd / rate;
}
