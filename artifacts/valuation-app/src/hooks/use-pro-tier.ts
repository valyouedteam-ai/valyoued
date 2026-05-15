import {
  createContext,
  useContext,
  useState,
  useEffect,
  createElement,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";

const STORAGE_KEY = "valyoued.pro";

type ProTierContextValue = {
  isPro: boolean;
  setIsPro: Dispatch<SetStateAction<boolean>>;
};

const ProTierContext = createContext<ProTierContextValue | null>(null);

export function ProTierProvider({ children }: { children: ReactNode }) {
  const [isPro, setIsPro] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "true";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isPro));
  }, [isPro]);

  /** Keep tabs in sync when localStorage changes elsewhere. */
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || e.newValue == null) return;
      setIsPro(e.newValue === "true");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return createElement(ProTierContext.Provider, { value: { isPro, setIsPro } }, children);
}

export function useProTier(): ProTierContextValue {
  const ctx = useContext(ProTierContext);
  if (!ctx) {
    throw new Error("useProTier must be used within a ProTierProvider");
  }
  return ctx;
}
