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

export function convertToUsdApprox(amount: number, currencyCode: string | null | undefined): number {
  if (!Number.isFinite(amount)) return 0;
  const c = (currencyCode ?? "USD").trim().toUpperCase();
  const rate = FX_TO_USD[c] ?? 1;
  return amount * rate;
}
