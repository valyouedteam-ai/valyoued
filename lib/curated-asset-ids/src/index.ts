/**
 * Catch-all wizard type; always shown with curated MVP types below.
 */
export const GENERAL_ITEM_ASSET_TYPE_ID = "general-item" as const;

/**
 * Guided wizard templates shown in `/estimates/new`.
 * Count of curated wizard templates (internal; do not surface in user-facing copy).
 */
export const CURATED_ASSET_TYPE_IDS = [
  "smartphone",
  "tablet",
  "laptop",
  "luxury-watch",
  "vintage-watch",
  "camera",
  "car",
  "sneakers",
  "designer-handbag",
  "fine-jewelry",
  "fine-art",
  "wine-spirits",
  "trading-cards",
] as const;

export type CuratedAssetTypeId = (typeof CURATED_ASSET_TYPE_IDS)[number];

const CURATED_LOOKUP = new Set<string>(CURATED_ASSET_TYPE_IDS);

/** First-class guided types (Anything Else is separate). */
export const WIZARD_CURATED_PRIMARY_COUNT = CURATED_ASSET_TYPE_IDS.length;

export function isWizardSupportedAssetTypeId(assetTypeId: string | undefined | null): boolean {
  if (!assetTypeId) return false;
  return CURATED_LOOKUP.has(assetTypeId) || assetTypeId === GENERAL_ITEM_ASSET_TYPE_ID;
}

/** Tier-aware list for the wizard grid only (`/api/asset-types` stays full catalog server-side). */
export function pickAssetTypesForWizardPicker<T extends { id: string }>(tierMatched: T[]): T[] {
  return tierMatched.filter(
    (t) => CURATED_LOOKUP.has(t.id) || t.id === GENERAL_ITEM_ASSET_TYPE_ID,
  );
}
