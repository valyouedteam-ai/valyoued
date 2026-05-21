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

const STORAGE_KEY = "valyoued-dev-pro-preview";

function readStoredPreview(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export type ProTierContextValue = {
  /** True while the UI "Pro tier" preview switch is on (front-end only until billing gates return). */
  isPro: boolean;
  /** Persisted local flag between Free-tier and Pro-tier UI (billing does not enforce this currently). */
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

  const isPro = devProPreview;

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

  if (!ctx) {
    const p = readStoredPreview();
    return {
      isPro: p,
      devProPreview: p,
      setDevProPreview: () => {},
      setIsPro: () => {},
    };
  }
  return ctx;
}
