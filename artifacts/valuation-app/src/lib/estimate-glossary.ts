/**
 * Plain-language popovers for valuation fields. Keys are referenced from the wizard FieldGlossary map.
 * Optional `imageSrc` points to files under `public/` when we add diagrams.
 */
export type GlossaryEntry = {
  title: string;
  body: string;
  /** Optional relative path from site root e.g. /glossary/shutter-count.svg */
  imageSrc?: string;
};

export const GLOSSARY: Record<string, GlossaryEntry> = {
  condition_scale: {
    title: "Condition score",
    body: "This is a simple 1 to 10 scale for how the item looks and works for its age. 1 means heavy wear or faults buyers will notice. 10 means like new or mint, with no issues you would mention in a listing. Be honest: small marks usually land in the middle.",
  },
  unlocked_vs_locked: {
    title: "Unlocked vs carrier-locked",
    body: "Unlocked phones and cellular tablets work on many networks. Carrier-locked devices are tied to one phone company until they are unlocked. Unlocked usually sells for more because the buyer has more choice.",
  },
  battery_health: {
    title: "Battery health",
    body: "On many phones and laptops you can see a battery health or maximum capacity percentage. Lower numbers mean shorter life between charges, which can lower resale value. If you do not know, leave it blank.",
  },
  storage_tier: {
    title: "Storage size",
    body: "More storage usually means a higher price for the same model, especially for phones, tablets, and consoles. Pick the size printed on the box or shown in settings.",
  },
  shutter_count: {
    title: "Shutter count",
    body: "Digital cameras track how many photos the shutter has fired. Higher counts mean more mechanical wear. Buyers often ask for this on used bodies. You can find it in the camera menu or manual.",
  },
  lens_included: {
    title: "Lenses included",
    body: "List any lenses that stay with the camera. Bundles with popular lenses usually sell for more than a body alone. One short line is enough, for example 24 to 70 millimeter f2.8.",
  },
  groupset: {
    title: "Groupset",
    body: "The groupset is the main drivetrain parts on a bike: shifters, derailleurs, cassette, chain, and often crank. Brands like Shimano and SRAM have levels like 105, Ultegra, or Dura-Ace. Matching the exact level helps pricing.",
  },
  frame_size: {
    title: "Frame size",
    body: "Bike size is often a sticker on the frame, like 54 centimeters, or small or medium. Put that here or in the model line so buyers know it fits them.",
  },
  deadstock_og: {
    title: "Deadstock and OG box",
    body: "Deadstock usually means new and unworn, as if it just left the store. OG box means the original shoe box. Missing box or heavy wear usually lowers resale price compared with a crisp pair with box.",
  },
  authentication_tiers: {
    title: "Proof of authenticity",
    body: "Store receipts and third-party certificates help buyers trust a luxury bag. If you are unsure, pick the honest option. We will not assume proof you do not have.",
  },
  handbag_codes: {
    title: "Serial or date code",
    body: "Many brands stamp or print an internal code that helps date the bag. It is not the same as a store receipt. If you see a code inside a pocket or on a small tab, you can type it here.",
  },
  originality: {
    title: "Original parts",
    body: "All original means the parts the maker installed are still there. Modified can mean new pickups, refrets, or tuners. Collectors often pay more for clean, original examples.",
  },
  maturity_score: {
    title: "Product maturity",
    body: "For a software product, this is how polished the business is, not physical wear. 1 is an early beta. 10 is stable, documented, and running smoothly for paying customers.",
  },
};

/** Map asset field keys (and a few wizard-only keys) to glossary ids. */
export const FIELD_GLOSSARY_KEYS: Record<string, string> = {
  condition: "condition_scale",
  networkLock: "unlocked_vs_locked",
  cellular: "unlocked_vs_locked",
  batteryHealth: "battery_health",
  storage: "storage_tier",
  shutterCount: "shutter_count",
  lenses: "lens_included",
  groupset: "groupset",
  ogBox: "deadstock_og",
  wearSummary: "deadstock_og",
  authenticity: "authentication_tiers",
  serialOrDateCode: "handbag_codes",
  originality: "originality",
};

export function getGlossaryForField(fieldKey: string, assetTypeId?: string): GlossaryEntry | undefined {
  if (fieldKey === "model" && assetTypeId === "bicycle") {
    return GLOSSARY.frame_size;
  }
  const id = FIELD_GLOSSARY_KEYS[fieldKey];
  return id ? GLOSSARY[id] : undefined;
}
