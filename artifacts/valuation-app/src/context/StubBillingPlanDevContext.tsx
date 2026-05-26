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

/** Canonical values sent via `X-Stub-Billing-Plan` (auth stub runs in stub mode; local Clerk overlays in NODE_ENV development on the API only). */
export type StubBillingPlanSlug = "free" | "everyday_plus" | "professional";

const STORAGE_KEY = "valyoued.stubBillingPlan";
const STORAGE_INHERITANCE = "valyoued.stubInheritanceAddon";

function readStoredSlug(): StubBillingPlanSlug | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)?.trim().toLowerCase();
    if (raw === "everyday_plus" || raw === "professional" || raw === "free") return raw as StubBillingPlanSlug;
  } catch {
    /* quota / privacy mode */
  }
  return null;
}

function readStoredInheritance(): boolean {
  try {
    const raw = sessionStorage.getItem(STORAGE_INHERITANCE)?.trim();
    if (raw === "1") return true;
    if (raw === "0") return false;
  } catch {
    /* quota / privacy mode */
  }
  return false;
}

export type StubBillingPlanDevContextValue = {
  planSlug: StubBillingPlanSlug;
  setPlanSlug: (slug: StubBillingPlanSlug) => void;
  inheritanceAddon: boolean;
  setInheritanceAddon: (next: boolean) => void;
};

export const StubBillingPlanDevContext = createContext<StubBillingPlanDevContextValue | null>(null);

export function useOptionalStubBillingPlanDev() {
  return useContext(StubBillingPlanDevContext);
}

/** Dev Subscription strip: registers X-Stub-Billing-Plan on API calls. Auth stub reads it on every tier. Clerk: server overlays Stripe when NODE_ENV=development or ALLOW_DEV_STUB_BILLING_HEADERS=1 on the API. Mirrors persona for desk vs portfolio UX. */
export function StubBillingPlanDevProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const [planSlug, setPlanSlugState] = useState<StubBillingPlanSlug>(() => readStoredSlug() ?? "free");
  const [inheritanceAddon, setInheritanceAddonState] = useState(readStoredInheritance);

  const setPlanSlug = useCallback((slug: StubBillingPlanSlug) => {
    setPlanSlugState(slug);
    try {
      sessionStorage.setItem(STORAGE_KEY, slug);
    } catch {
      /* ignore */
    }
  }, []);

  const setInheritanceAddon = useCallback((next: boolean) => {
    setInheritanceAddonState(next);
    try {
      sessionStorage.setItem(STORAGE_INHERITANCE, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setExtraRequestHeadersGetter(() => ({
      "X-Stub-Billing-Plan": planSlug,
      "X-Stub-Inheritance-Addon": inheritanceAddon ? "1" : "0",
    }));
    return () => setExtraRequestHeadersGetter(null);
  }, [planSlug, inheritanceAddon]);

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
    void queryClient.invalidateQueries({ queryKey: ["/api/portfolios"] });
  }, [planSlug, inheritanceAddon, queryClient]);

  const value = useMemo(
    (): StubBillingPlanDevContextValue => ({
      planSlug,
      setPlanSlug,
      inheritanceAddon,
      setInheritanceAddon,
    }),
    [planSlug, setPlanSlug, inheritanceAddon, setInheritanceAddon],
  );

  return <StubBillingPlanDevContext.Provider value={value}>{children}</StubBillingPlanDevContext.Provider>;
}
