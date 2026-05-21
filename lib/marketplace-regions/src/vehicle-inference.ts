export type CanonicalFuelKeyword = "Diesel" | "Electric";

export type VehicleFuelHint = {
  /** Canonical keyword we map into localized dropdown labels. */
  canonical: CanonicalFuelKeyword;
  /** Shown beside the suggestion chip. */
  reason: string;
};

const DIESEL_NEEDLES =
  /\b(tdi\b|blue ?tec|blueefficiency\s*d|dci\b|hdi\b|crdi|cdti|dcdi|\bjtd\b|\btd\b|turbo\s*diesel|\bd\s*diesel\b)/i;

/**
 * Lightweight heuristics from free-text brand or model lines. Caller must confirm; never persist without user acceptance.
 */
export function inferVehicleFuelHint(args: { brand?: string; model?: string }): VehicleFuelHint | null {
  const brand = (args.brand ?? "").trim();
  const model = (args.model ?? "").trim();
  const blob = `${brand} ${model}`.trim();

  if (!blob) return null;

  if (/\btesla\b/i.test(brand) || /^tesla\b/i.test(blob)) {
    return { canonical: "Electric", reason: "Tesla sells battery electric vehicles. Please confirm this matches your car." };
  }

  const evBlob =
    /\b(ioniq\s*6|ioniq\s*5|bolt\s*ev|nissan\s*leaf|mach-e|taycan|e-tron\b|electric\b|\bev\b)/i;
  if (evBlob.test(blob)) {
    return { canonical: "Electric", reason: "The wording often marks a plug-in battery electric line. Please confirm." };
  }

  if (DIESEL_NEEDLES.test(blob)) {
    return { canonical: "Diesel", reason: "Naming often hints at diesel (please confirm with your badges or handbook)." };
  }

  return null;
}

/** Map a canonical fuel suggestion onto one of the localized option strings from the fuel dropdown. */
export function matchFuelDropdownOption(canonical: CanonicalFuelKeyword, localizedOptions: string[]): string | undefined {
  const c = canonical.toLowerCase();
  return localizedOptions.find((o) => o.toLowerCase().includes(c));
}
