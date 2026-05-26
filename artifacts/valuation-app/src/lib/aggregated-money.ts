import { convertFromUsdApprox } from "@workspace/fx-usd";
import { formatMoney } from "@/lib/format";

/**
 * Format a cross-currency dashboard rollup for the viewer's reference currency (Settings).
 *
 * Rollup payloads use the app's shared FX multiplier table (`GET /fx/rates`; see `convertFromUsdApprox`).
 * Pass `displayCurrency` from Settings so the formatted string matches the user's chosen reference ISO code.
 */
export function formatUsdRollupForDisplay(
  rollupInInternalUnit: number,
  displayCurrency: string,
  usdMultipliers: Readonly<Record<string, number>> | null | undefined,
): string {
  const v = convertFromUsdApprox(rollupInInternalUnit, displayCurrency, usdMultipliers);
  return formatMoney(v, displayCurrency);
}
