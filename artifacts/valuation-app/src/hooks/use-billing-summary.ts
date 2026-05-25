import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";
import { customFetch } from "@workspace/api-client-react";
import { StubBillingPlanDevContext } from "@/context/StubBillingPlanDevContext";
import { AUTH_STUB_MODE } from "@/lib/auth-stub";
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
  /** Separate inheritance ledger billing (standalone Stripe subscription). */
  hasInheritanceAddon?: boolean;
  /** comparable grid: preview shows first two comps for unsubscribed Everyday accounts on free-tier snapshots. */
  comparableUiMode?: "full" | "preview";
};

/** Server-backed billing + entitlement snapshot. Uses the shared Bearer token getter. */
export function useBillingSummary() {
  const stubDev = useContext(StubBillingPlanDevContext);
  const stubSlug = AUTH_STUB_MODE && stubDev ? stubDev.planSlug : null;

  return useQuery({
    queryKey: ["me-billing", stubSlug ?? "live"],
    staleTime: 60_000,
    queryFn: () => customFetch<MeBillingResponse>(apiUrl("/api/me/billing"), { method: "GET", responseType: "json" }),
  });
}
