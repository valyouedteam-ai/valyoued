import { useCallback, useEffect, useState } from "react";
import {
  REFERENCE_CURRENCY_CHANGED_EVENT,
  getReferenceCurrencyCode,
  setStoredReferenceCurrency,
} from "@/lib/reference-currency";

export function useDisplayCurrency() {
  const [code, setCodeState] = useState(getReferenceCurrencyCode);

  const refresh = useCallback(() => {
    setCodeState(getReferenceCurrencyCode());
  }, []);

  useEffect(() => {
    const on = () => refresh();
    window.addEventListener(REFERENCE_CURRENCY_CHANGED_EVENT, on);
    return () => window.removeEventListener(REFERENCE_CURRENCY_CHANGED_EVENT, on);
  }, [refresh]);

  const setCode = useCallback((next: string | null) => {
    setStoredReferenceCurrency(next);
    refresh();
  }, [refresh]);

  return { code, setCode, refresh };
}
