import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { apiUrl } from "@/lib/api-url";

/** Response from `GET /api/me/billing` (authenticated). */
export type MeBillingResponse = {
  tier: string;
  status: string;
  stripeCustomerId: string | null;
  stripeStub?: boolean;
  planSlug: string;
  valuationsThisMonth?: number;
  valuationsMonthLimit: number | null;
  valuationsRemainingFree: number | null;
  hasPaidValuationTier: boolean;
};

/** Server-backed billing + entitlement snapshot. Uses the shared Bearer token getter. */
export function useBillingSummary() {
  return useQuery({
    queryKey: ["me-billing"],
    staleTime: 60_000,
    queryFn: () => customFetch<MeBillingResponse>(apiUrl("/api/me/billing"), { method: "GET", responseType: "json" }),
  });
}
