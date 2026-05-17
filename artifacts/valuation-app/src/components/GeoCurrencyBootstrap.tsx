import { useEffect } from "react";
import { apiUrl, apiFetchCredentials } from "@/lib/api-url";
import {
  getStoredReferenceCurrency,
  getSessionGeoCountry,
  setSessionGeoCountry,
} from "@/lib/reference-currency";

type GeoResponse = {
  country?: string | null;
};

/**
 * Fetches coarse country from the API using edge / CDN headers (Cloudflare, Vercel, CloudFront).
 * Stored in sessionStorage for automatic display currency; skipped if the user pinned a currency
 * or we already have a value this session.
 */
export function GeoCurrencyBootstrap() {
  useEffect(() => {
    try {
      if (getStoredReferenceCurrency()) return;
      if (getSessionGeoCountry()) return;
    } catch {
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/geo"), {
          credentials: apiFetchCredentials(),
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as GeoResponse;
        if (typeof data.country !== "string" || data.country.length !== 2) return;
        setSessionGeoCountry(data.country);
      } catch {
        /* offline / blocked / CORS */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
