import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { setExtraRequestHeadersGetter } from "@workspace/api-client-react";
import { PERSONA_SESSION_KEY } from "@/hooks/use-persona-sync";

/** Canonical values sent via `X-Stub-Billing-Plan` together with AUTH_STUB_MODE. */
export type StubBillingPlanSlug = "free" | "everyday_plus" | "professional";

const STORAGE_KEY = "valyoued.stubBillingPlan";

function readStoredSlug(): StubBillingPlanSlug | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)?.trim().toLowerCase();
    if (raw === "everyday_plus" || raw === "professional" || raw === "free") return raw as StubBillingPlanSlug;
  } catch {
    /* quota / privacy mode */
  }
  return null;
}

export const StubBillingPlanDevContext = createContext<null | {
  planSlug: StubBillingPlanSlug;
  setPlanSlug: (slug: StubBillingPlanSlug) => void;
}>(null);

export function useOptionalStubBillingPlanDev() {
  return useContext(StubBillingPlanDevContext);
}

/** Auth stub builds: registers per-request billing header sync and mirrors persona for desk vs portfolio UX. */
export function StubBillingPlanDevProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const [planSlug, setPlanSlugState] = useState<StubBillingPlanSlug>(() => readStoredSlug() ?? "free");

  const setPlanSlug = useCallback((slug: StubBillingPlanSlug) => {
    setPlanSlugState(slug);
    try {
      sessionStorage.setItem(STORAGE_KEY, slug);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setExtraRequestHeadersGetter(() => ({
      "X-Stub-Billing-Plan": planSlug,
    }));
    return () => setExtraRequestHeadersGetter(null);
  }, [planSlug]);

  useEffect(() => {
    try {
      const persona = planSlug === "professional" ? "professional" : "everyday";
      sessionStorage.setItem(PERSONA_SESSION_KEY, persona);
    } catch {
      /* ignore */
    }
  }, [planSlug]);

  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: ["me-billing"] });
  }, [planSlug, queryClient]);

  const value = useMemo(() => ({ planSlug, setPlanSlug }), [planSlug, setPlanSlug]);

  return <StubBillingPlanDevContext.Provider value={value}>{children}</StubBillingPlanDevContext.Provider>;
}
