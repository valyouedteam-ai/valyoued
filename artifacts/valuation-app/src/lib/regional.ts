type Locale = "us" | "ca" | "uk" | "au" | "nz" | "eu-de" | "eu-fr" | "eu-it" | "eu-es" | "eu" | "ch" | "jp" | "intl-metric";

type LocaleBucket = {
  fuel: "gas" | "petrol";
  distance: "miles" | "km";
  area: "sqft" | "sqm";
  carrierLock: "Carrier" | "Network";
  inspection: string;
  fuelOptions: string[];
};

const BUCKETS: Record<Locale, LocaleBucket> = {
  us:        { fuel: "gas",    distance: "miles", area: "sqft", carrierLock: "Carrier", inspection: "State safety / emissions inspection", fuelOptions: ["Gas", "Diesel", "Hybrid", "Plug-in Hybrid", "Electric"] },
  ca:        { fuel: "gas",    distance: "km",    area: "sqft", carrierLock: "Carrier", inspection: "Provincial safety inspection", fuelOptions: ["Gas", "Diesel", "Hybrid", "Plug-in Hybrid", "Electric"] },
  uk:        { fuel: "petrol", distance: "miles", area: "sqft", carrierLock: "Network", inspection: "MOT certificate", fuelOptions: ["Petrol", "Diesel", "Hybrid", "Plug-in Hybrid", "Electric"] },
  au:        { fuel: "petrol", distance: "km",    area: "sqm",  carrierLock: "Network", inspection: "Roadworthy Certificate (RWC)", fuelOptions: ["Petrol", "Diesel", "Hybrid", "Plug-in Hybrid", "Electric", "LPG"] },
  nz:        { fuel: "petrol", distance: "km",    area: "sqm",  carrierLock: "Network", inspection: "Warrant of Fitness (WOF)", fuelOptions: ["Petrol", "Diesel", "Hybrid", "Plug-in Hybrid", "Electric"] },
  "eu-de":   { fuel: "petrol", distance: "km",    area: "sqm",  carrierLock: "Network", inspection: "TÜV Hauptuntersuchung (HU)", fuelOptions: ["Benzin (Petrol)", "Diesel", "Hybrid", "Plug-in Hybrid", "Elektro", "LPG / Autogas"] },
  "eu-fr":   { fuel: "petrol", distance: "km",    area: "sqm",  carrierLock: "Network", inspection: "Contrôle technique", fuelOptions: ["Essence (Petrol)", "Diesel", "Hybride", "Hybride rechargeable", "Électrique", "GPL"] },
  "eu-it":   { fuel: "petrol", distance: "km",    area: "sqm",  carrierLock: "Network", inspection: "Revisione auto", fuelOptions: ["Benzina (Petrol)", "Diesel", "Ibrido", "Plug-in Hybrid", "Elettrico", "GPL"] },
  "eu-es":   { fuel: "petrol", distance: "km",    area: "sqm",  carrierLock: "Network", inspection: "Inspección Técnica (ITV)", fuelOptions: ["Gasolina (Petrol)", "Diésel", "Híbrido", "Híbrido enchufable", "Eléctrico", "GLP"] },
  eu:        { fuel: "petrol", distance: "km",    area: "sqm",  carrierLock: "Network", inspection: "Periodic vehicle inspection", fuelOptions: ["Petrol", "Diesel", "Hybrid", "Plug-in Hybrid", "Electric", "LPG"] },
  ch:        { fuel: "petrol", distance: "km",    area: "sqm",  carrierLock: "Network", inspection: "Motorfahrzeugkontrolle (MFK)", fuelOptions: ["Petrol", "Diesel", "Hybrid", "Plug-in Hybrid", "Electric"] },
  jp:        { fuel: "petrol", distance: "km",    area: "sqm",  carrierLock: "Network", inspection: "Shaken (車検)", fuelOptions: ["Petrol", "Diesel", "Hybrid", "Plug-in Hybrid", "Electric"] },
  "intl-metric": { fuel: "petrol", distance: "km", area: "sqm", carrierLock: "Network", inspection: "Periodic vehicle inspection", fuelOptions: ["Petrol", "Diesel", "Hybrid", "Plug-in Hybrid", "Electric"] },
};

const REGION_TO_LOCALE: Record<string, Locale> = {
  "United States": "us",
  "Canada": "ca",
  "United Kingdom": "uk",
  "Germany": "eu-de",
  "France": "eu-fr",
  "Italy": "eu-it",
  "Spain": "eu-es",
  "European Union": "eu",
  "Switzerland": "ch",
  "Japan": "jp",
  "Australia": "au",
  "New Zealand": "nz",
  "Hong Kong": "intl-metric",
  "Singapore": "intl-metric",
  "UAE": "intl-metric",
  "China": "intl-metric",
  "South Korea": "intl-metric",
  "India": "intl-metric",
  "Mexico": "ca",
  "Brazil": "intl-metric",
  "South Africa": "intl-metric",
};

export function getLocale(regionName: string | undefined | null): LocaleBucket {
  if (!regionName) return BUCKETS["intl-metric"];
  const code = REGION_TO_LOCALE[regionName] ?? "intl-metric";
  return BUCKETS[code];
}

type GenericField = {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: string[];
};

/**
 * Returns a region-localized clone of an asset field.
 * Handles fuel/mileage/area/network-lock/inspection terminology so that
 * "Mileage" becomes "Mileage (km)" in Australia, "Petrol" becomes "Gas" in the US, etc.
 */
export function localizeField<T extends GenericField>(field: T, regionName: string | undefined | null): T {
  if (!regionName) return field;
  const loc = getLocale(regionName);
  const out: any = { ...field };

  const k = field.key;

  // Mileage (distance)
  if (k === "mileage") {
    out.label = loc.distance === "km" ? "Mileage (km)" : "Mileage (miles)";
    if (loc.distance === "km" && field.placeholder === "48000") out.placeholder = "75000";
    if (loc.distance === "km" && field.placeholder === "62000") out.placeholder = "100000";
  }

  // Fuel type
  if (k === "fuelType") {
    out.label = loc.fuel === "gas" ? "Fuel type (gas / diesel / etc.)" : "Fuel type";
    out.options = loc.fuelOptions;
  }

  // Square footage / metres
  if (k === "sqft") {
    out.label = loc.area === "sqm" ? "Internal area (sq m)" : "Internal area (sq ft)";
    if (loc.area === "sqm") out.placeholder = "120";
  }

  // Network / carrier lock
  if (k === "networkLock") {
    out.label = `${loc.carrierLock} status`;
    out.options = ["Unlocked", `${loc.carrierLock}-locked`];
  }

  // Property type: minor terminology
  if (k === "model" && (field.options || []).includes("Apartment / Flat")) {
    if (loc.fuel === "gas") {
      // US/CA prefer "Apartment / Condo" wording
      out.options = ["Detached house", "Semi-detached", "Townhouse", "Apartment", "Condo", "Co-op", "Bungalow"];
    } else if (regionName === "Australia" || regionName === "New Zealand") {
      out.options = ["Detached house", "Semi-detached", "Terrace house", "Unit / Apartment", "Townhouse", "Bungalow", "Granny flat"];
    }
  }

  // EPC vs energy rating note
  if (k === "extraNotes") {
    if (loc.fuel === "gas" && (field.help || "").includes("EPC")) {
      out.help = field.help!.replace("EPC", "Energy rating / utilities");
    }
  }

  // Bonded warehouse for wine/spirits: UK term
  if (k === "wineCellarStorage" && (field.options || []).some((o) => o.toLowerCase().includes("bonded"))) {
    if (loc.fuel === "gas") {
      out.options = field.options!.map((o) =>
        o.includes("Professional bonded warehouse") ? "Climate-controlled storage facility" : o
      );
    }
  }

  // MOT / safety inspection mentioned in extras placeholder
  if (k === "extraNotes" && (field.placeholder || "").includes("MOT")) {
    out.placeholder = field.placeholder!.replace(/12 months MOT/i, `Valid ${loc.inspection}`);
  }
  if (k === "extraNotes" && (field.help || "").toLowerCase().includes("mot")) {
    out.help = field.help!.replace(/MOT/gi, loc.inspection);
  }

  return out as T;
}

/** Returns all locale terms for use in form-level labels (such as the tagline). */
export function getRegionalTerms(regionName: string | undefined | null) {
  return getLocale(regionName);
}
