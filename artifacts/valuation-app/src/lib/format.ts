/**
 * Removes one pair of outer double quotes (ASCII or curly) when the whole string is wrapped that way — common LLM artifact.
 */
export function stripRedundantOuterQuotes(value: string): string {
  const s = value.trim();
  if (s.length < 2) return value;
  const pairs: Array<[string, string]> = [
    ['"', '"'],
    ["\u201c", "\u201d"],
  ];
  for (const [open, close] of pairs) {
    if (s.startsWith(open) && s.endsWith(close)) {
      return s.slice(open.length, s.length - close.length).trim();
    }
  }
  return value;
}

export function formatMoney(value: number, currency = "USD", compact = false) {
  if (value === null || value === undefined || isNaN(value)) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(0);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value);
}

// Backwards-compat wrapper used by older pages – assumes USD when not specified.
export function formatCurrency(value: number, compactOrCurrency: boolean | string = false, compact = false) {
  if (typeof compactOrCurrency === "string") {
    return formatMoney(value, compactOrCurrency, compact);
  }
  return formatMoney(value, "USD", compactOrCurrency);
}

export function formatPercent(value: number, signed = false) {
  if (isNaN(value)) return "0%";
  const formatted = new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
  return signed && value > 0 ? `+${formatted}` : formatted;
}

export function formatNumber(value: number) {
  if (isNaN(value)) return "0";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

export function formatDate(dateInput: string | Date | number | null | undefined) {
  if (dateInput === null || dateInput === undefined || dateInput === "") {
    return "N/A";
  }
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) {
    return "N/A";
  }
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(d);
}

/** ISO-8601 UTC, or N/A when missing / invalid. */
export function formatIsoDateTime(dateInput: string | Date | number | null | undefined) {
  if (dateInput === null || dateInput === undefined || dateInput === "") {
    return "N/A";
  }
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return Number.isNaN(d.getTime()) ? "N/A" : d.toISOString();
}
