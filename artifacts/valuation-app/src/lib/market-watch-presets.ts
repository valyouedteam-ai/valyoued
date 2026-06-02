export type MarketWatchModelPreset = {
  label: string;
  variants?: string[];
};

export type MarketWatchBrandPreset = {
  label: string;
  models: MarketWatchModelPreset[];
};

export type MarketWatchAssetClassPreset = {
  id: string;
  label: string;
  /** Value stored on the API `assetClass` field. */
  apiAssetClass: string;
  brands: MarketWatchBrandPreset[];
  /** Show model year range inputs (cars). */
  showYearRange?: boolean;
};

export const MARKET_WATCH_ASSET_CLASSES: MarketWatchAssetClassPreset[] = [
  {
    id: "luxury-bags",
    label: "Luxury bags",
    apiAssetClass: "Luxury Bags",
    brands: [
      {
        label: "Chanel",
        models: [
          { label: "Classic Flap", variants: ["Small", "Medium", "Large", "Jumbo"] },
          { label: "2.55", variants: ["Medium", "Large"] },
          { label: "Boy Bag", variants: ["Small", "Medium"] },
          { label: "19", variants: ["Small", "Medium"] },
        ],
      },
      {
        label: "Hermès",
        models: [
          { label: "Birkin", variants: ["25", "30", "35"] },
          { label: "Kelly", variants: ["25", "28", "32"] },
          { label: "Constance", variants: ["18", "24"] },
        ],
      },
      {
        label: "Louis Vuitton",
        models: [
          { label: "Neverfull", variants: ["PM", "MM", "GM"] },
          { label: "Speedy", variants: ["25", "30", "35"] },
          { label: "Pochette Métis", variants: ["Standard"] },
        ],
      },
      {
        label: "Dior",
        models: [
          { label: "Lady Dior", variants: ["Mini", "Medium", "Large"] },
          { label: "Saddle", variants: ["Standard"] },
          { label: "Book Tote", variants: ["Small", "Medium", "Large"] },
        ],
      },
    ],
  },
  {
    id: "watches",
    label: "Watches",
    apiAssetClass: "Watches",
    brands: [
      {
        label: "Rolex",
        models: [
          { label: "Submariner", variants: ["No date", "Date"] },
          { label: "Datejust", variants: ["36mm", "41mm"] },
          { label: "GMT-Master II", variants: ["Standard"] },
          { label: "Daytona", variants: ["Standard"] },
        ],
      },
      {
        label: "Omega",
        models: [
          { label: "Speedmaster", variants: ["Professional", "Reduced"] },
          { label: "Seamaster", variants: ["300M", "Aqua Terra"] },
        ],
      },
      {
        label: "Cartier",
        models: [
          { label: "Tank", variants: ["Must", "Louis", "Française"] },
          { label: "Santos", variants: ["Medium", "Large"] },
        ],
      },
    ],
  },
  {
    id: "cars",
    label: "Cars",
    apiAssetClass: "Cars",
    showYearRange: true,
    brands: [
      {
        label: "Porsche",
        models: [
          { label: "911", variants: ["Carrera", "Turbo", "GT3"] },
          { label: "Cayenne", variants: ["Base", "S", "GTS"] },
          { label: "Boxster", variants: ["718", "GTS"] },
        ],
      },
      {
        label: "BMW",
        models: [
          { label: "3 Series", variants: ["320i", "330i", "M340i"] },
          { label: "M3", variants: ["Competition", "Standard"] },
        ],
      },
      {
        label: "Mercedes-Benz",
        models: [
          { label: "C-Class", variants: ["C200", "C300", "AMG C43"] },
          { label: "E-Class", variants: ["E220d", "E300", "AMG E53"] },
        ],
      },
    ],
  },
  {
    id: "electronics",
    label: "Electronics",
    apiAssetClass: "Electronics",
    brands: [
      {
        label: "Apple",
        models: [
          { label: "iPhone", variants: ["15 Pro", "15 Pro Max", "16 Pro"] },
          { label: "MacBook Pro", variants: ["14\"", "16\""] },
          { label: "iPad Pro", variants: ["11\"", "13\""] },
        ],
      },
      {
        label: "Samsung",
        models: [
          { label: "Galaxy S", variants: ["S24", "S24 Ultra"] },
          { label: "Galaxy Tab", variants: ["S9", "S9 Ultra"] },
        ],
      },
      {
        label: "Sony",
        models: [
          { label: "PlayStation 5", variants: ["Disc", "Digital", "Pro"] },
          { label: "Alpha camera", variants: ["A7 IV", "A7R V"] },
        ],
      },
    ],
  },
];

export function findMarketWatchAssetClass(id: string): MarketWatchAssetClassPreset | undefined {
  return MARKET_WATCH_ASSET_CLASSES.find((c) => c.id === id);
}

export function composeMarketWatchLabel(parts: {
  brand: string;
  model: string;
  variant?: string;
  yearFrom?: number;
  yearTo?: number;
}): string {
  const head = [parts.brand, parts.model, parts.variant].filter(Boolean).join(" · ");
  if (parts.yearFrom != null || parts.yearTo != null) {
    const from = parts.yearFrom ?? parts.yearTo;
    const to = parts.yearTo ?? parts.yearFrom;
    if (from != null && to != null && from !== to) return `${head} · ${from}-${to}`;
    if (from != null) return `${head} · ${from}`;
  }
  return head;
}

export function formatMarketWatchCardTitle(watch: {
  label: string;
  brand?: string;
  model?: string;
}): string {
  if (watch.brand?.trim() && watch.model?.trim()) {
    return `${watch.brand.trim()} ${watch.model.trim()}`;
  }
  return watch.label;
}

export function formatMarketWatchCardSubtitle(watch: {
  assetClass: string;
  yearFrom?: number;
  yearTo?: number;
}): string {
  const bits: string[] = [watch.assetClass];
  if (watch.yearFrom != null || watch.yearTo != null) {
    const from = watch.yearFrom ?? watch.yearTo;
    const to = watch.yearTo ?? watch.yearFrom;
    if (from != null && to != null && from !== to) bits.push(`${from}-${to}`);
    else if (from != null) bits.push(String(from));
  }
  return bits.join(" · ");
}
