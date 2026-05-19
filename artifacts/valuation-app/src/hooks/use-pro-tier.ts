import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useBillingSummary } from "@/hooks/use-billing-summary";

/** @deprecated Prefer `useBillingSummary` — legacy layout still imports this provider. */
export function ProTierProvider({ children }: { children: ReactNode }) {
  return children;
}

type ProTierContextValue = {
  isPro: boolean;
  /** No-op — subscription is Stripe-backed. Kept only for gradual UI clean-up. */
  setIsPro: Dispatch<SetStateAction<boolean>>;
};

/** Back-compat: maps paid valuation entitlements from `GET /api/me/billing`. */
export function useProTier(): ProTierContextValue {
  const { data } = useBillingSummary();
  const paid = Boolean(data?.hasPaidValuationTier);

  const setIsPro: Dispatch<SetStateAction<boolean>> = () => {};

  return { isPro: paid, setIsPro };
}
