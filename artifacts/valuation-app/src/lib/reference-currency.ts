/** Fired after localStorage preference is updated so open pages can refresh display amounts. */
export const REFERENCE_CURRENCY_CHANGED_EVENT = "valyoued:reference-currency-changed";

export const REF_CURRENCY_STORAGE_KEY = "valyoued.referenceCurrency";

/** Currencies supported for portfolio / stats roll-up display (subset of the shared FX static table). */
export const DISPLAY_CURRENCY_OPTIONS = [
  { code: "EUR", label: "Euro (EUR)" },
  { code: "GBP", label: "Pound sterling (GBP)" },
  { code: "USD", label: "US dollar (USD)" },
  { code: "CAD", label: "Canadian dollar (CAD)" },
  { code: "AUD", label: "Australian dollar (AUD)" },
  { code: "JPY", label: "Japanese yen (JPY)" },
  { code: "CHF", label: "Swiss franc (CHF)" },
  { code: "SGD", label: "Singapore dollar (SGD)" },
  { code: "HKD", label: "Hong Kong dollar (HKD)" },
  { code: "AED", label: "UAE dirham (AED)" },
  { code: "INR", label: "Indian rupee (INR)" },
  { code: "CNY", label: "Chinese yuan (CNY)" },
  { code: "NZD", label: "New Zealand dollar (NZD)" },
  { code: "ZAR", label: "South African rand (ZAR)" },
] as const;

/** Euro area + related (ECB euro). */
const EUR_REGIONS = new Set([
  "AT",
  "BE",
  "HR",
  "CY",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PT",
  "SK",
  "SI",
  "ES",
  "AD",
  "MC",
  "SM",
  "VA",
  "XK",
]);

function regionToCurrency(region: string | undefined): string | null {
  if (!region) return null;
  const R = region.toUpperCase();
  if (R === "US") return "USD";
  if (R === "GB") return "GBP";
  if (EUR_REGIONS.has(R)) return "EUR";
  const map: Record<string, string> = {
    CA: "CAD",
    AU: "AUD",
    JP: "JPY",
    CH: "CHF",
    SG: "SGD",
    HK: "HKD",
    AE: "AED",
    IN: "INR",
    CN: "CNY",
    NZ: "NZD",
    ZA: "ZAR",
  };
  return map[R] ?? null;
}

/** Map ISO 3166-1 alpha-2 (e.g. from geo-IP headers) to a supported display currency, if known. */
export function countryCodeToDisplayCurrency(iso3166Alpha2: string | null | undefined): string | null {
  if (!iso3166Alpha2 || typeof iso3166Alpha2 !== "string") return null;
  const code = iso3166Alpha2.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  return regionToCurrency(code);
}

const GEO_COUNTRY_SESSION_KEY = "valyoued.geoCountry";

/** Session-only country from GET /api/geo (IP / edge hints). Not persisted across tabs. */
export function getSessionGeoCountry(): string | null {
  try {
    const v = sessionStorage.getItem(GEO_COUNTRY_SESSION_KEY)?.trim().toUpperCase();
    if (v && /^[A-Z]{2}$/.test(v)) return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function setSessionGeoCountry(iso3166Alpha2: string | null): void {
  try {
    if (!iso3166Alpha2) {
      sessionStorage.removeItem(GEO_COUNTRY_SESSION_KEY);
    } else {
      const c = iso3166Alpha2.trim().toUpperCase();
      if (/^[A-Z]{2}$/.test(c)) {
        sessionStorage.setItem(GEO_COUNTRY_SESSION_KEY, c);
      }
    }
  } catch {
    /* ignore */
  }
  notifyReferenceCurrencyChanged();
}

/**
 * Pick a display currency from the browser locale when the user has not set one.
 * Unknown regions default to EUR so the product is not USD-first.
 */
export function inferReferenceCurrencyFromBrowser(): string {
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale;
    const il = new Intl.Locale(loc);
    const region = typeof il.region === "string" ? il.region : undefined;
    const fromRegion = regionToCurrency(region);
    if (fromRegion) return fromRegion;
  } catch {
    /* ignore */
  }
  return "EUR";
}

export function notifyReferenceCurrencyChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(REFERENCE_CURRENCY_CHANGED_EVENT));
}

export function getStoredReferenceCurrency(): string | null {
  try {
    const v = localStorage.getItem(REF_CURRENCY_STORAGE_KEY)?.trim().toUpperCase();
    if (!v || v.length !== 3) return null;
    if (DISPLAY_CURRENCY_OPTIONS.some((o) => o.code === v)) return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function getReferenceCurrencyCode(): string {
  const pinned = getStoredReferenceCurrency();
  if (pinned) return pinned;
  const geo = getSessionGeoCountry();
  const fromGeo = geo ? countryCodeToDisplayCurrency(geo) : null;
  if (fromGeo) return fromGeo;
  return inferReferenceCurrencyFromBrowser();
}

/** Pass `null` to use automatic (browser-based) currency again. */
export function setStoredReferenceCurrency(code: string | null): void {
  try {
    if (!code) {
      localStorage.removeItem(REF_CURRENCY_STORAGE_KEY);
    } else {
      const c = code.trim().toUpperCase();
      if (DISPLAY_CURRENCY_OPTIONS.some((o) => o.code === c)) {
        localStorage.setItem(REF_CURRENCY_STORAGE_KEY, c);
      }
    }
  } catch {
    /* ignore */
  }
  notifyReferenceCurrencyChanged();
}
