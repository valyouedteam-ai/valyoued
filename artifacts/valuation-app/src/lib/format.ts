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

export function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(new Date(dateString));
}
