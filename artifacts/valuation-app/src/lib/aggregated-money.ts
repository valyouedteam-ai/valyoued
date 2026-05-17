import { convertFromUsdApprox } from "@workspace/fx-usd";
import { formatMoney } from "@/lib/format";

/** Format a USD-normalized dashboard total in the viewer's chosen display currency. */
export function formatUsdRollupForDisplay(
  valueUsd: number,
  displayCurrency: string,
  usdMultipliers: Readonly<Record<string, number>> | null | undefined,
): string {
  const v = convertFromUsdApprox(valueUsd, displayCurrency, usdMultipliers);
  return formatMoney(v, displayCurrency);
}
