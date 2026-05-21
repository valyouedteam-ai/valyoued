import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useBillingSummary } from "@/hooks/use-billing-summary";

const STORAGE_KEY = "valyoued-dev-pro-preview";

function readStoredPreview(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export type ProTierContextValue = {
  /** Paid subscription or dev preview toggle (see `devProPreview`). */
  isPro: boolean;
  /** Persisted local flag to unlock Pro UI without a subscription (cleared when toggled off). */
  devProPreview: boolean;
  setDevProPreview: Dispatch<SetStateAction<boolean>>;
  /** @deprecated Prefer `setDevProPreview`. */
  setIsPro: Dispatch<SetStateAction<boolean>>;
};

const ProTierContext = createContext<ProTierContextValue | null>(null);

export function ProTierProvider({ children }: { children: ReactNode }) {
  const [devProPreview, setDevProPreviewState] = useState(readStoredPreview);

  const persist = useCallback((next: boolean) => {
    try {
      if (next) localStorage.setItem(STORAGE_KEY, "1");
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore quota / private mode */
    }
  }, []);

  const setDevProPreview = useCallback(
    (value: SetStateAction<boolean>) => {
      setDevProPreviewState((prev) => {
        const next = typeof value === "function" ? (value as (p: boolean) => boolean)(prev) : value;
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const { data } = useBillingSummary();
  const paid = Boolean(data?.hasPaidValuationTier);
  const isPro = paid || devProPreview;

  const value = useMemo(
    (): ProTierContextValue => ({
      isPro,
      devProPreview,
      setDevProPreview,
      setIsPro: setDevProPreview,
    }),
    [devProPreview, isPro, setDevProPreview],
  );

  return createElement(ProTierContext.Provider, { value }, children);
}

export function useProTier(): ProTierContextValue {
  const ctx = useContext(ProTierContext);
  const { data } = useBillingSummary();
  const paid = Boolean(data?.hasPaidValuationTier);

  if (!ctx) {
    return {
      isPro: paid,
      devProPreview: false,
      setDevProPreview: () => {},
      setIsPro: () => {},
    };
  }
  return ctx;
}
