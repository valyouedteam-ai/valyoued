/** Region names from valuations; maps onto locale hints for drafting copy (not legal advice). */
const REGION_GROUPS = {
  us: ["United States"],
  canada: ["Canada", "Mexico"],
  uk: ["United Kingdom"],
  euEn: ["European Union", "Switzerland"],
  euDe: ["Germany"],
  euFr: ["France"],
  euIt: ["Italy"],
  euEs: ["Spain"],
  apacGb: ["Australia", "New Zealand", "Hong Kong", "Singapore", "India", "South Africa"],
  apacJp: ["Japan"],
  apacEa: ["China", "South Korea"],
  uae: ["UAE"],
  intlFallback: ["Brazil"],
} as const;

function inGroup(regionName: string | undefined | null, names: readonly string[]): boolean {
  if (!regionName) return false;
  return names.includes(regionName.trim());
}

/**
 * Prompt guidance so the listing matches local seller wording. Keep generic on titles and registrations.
 */
export function sellerTerminologyPromptLine(regionName: string | undefined | null): string {
  const r = regionName?.trim() || "the seller";

  if (inGroup(regionName, REGION_GROUPS.uk)) {
    return `Terminology (${r} sellers): Prefer UK terms such as motorway, boot, petrol, estate car, pavement, postcode, MOT, GBP. Avoid US-centric terms such as freeway, trunk, gasoline, sedan, curb, ZIP code unless quoting an import advertisement.`;
  }
  if (inGroup(regionName, REGION_GROUPS.us)) {
    return `Terminology (${r} sellers): Prefer US terms such as highway, freeway, trunk, gasoline, sedan, curb, ZIP code, state inspections or emissions where relevant. Avoid UK MOT wording unless this is explicitly a grey import discussed in notes.`;
  }
  if (inGroup(regionName, REGION_GROUPS.canada)) {
    return `Terminology (${r} sellers): Prefer Canadian familiarity: petrol often sold as gasoline in marketing copy, bilingual labels can appear near Quebec, kilometres for distance, provincial safety wording when describing inspections if applicable.`;
  }
  if (inGroup(regionName, REGION_GROUPS.euDe)) {
    return `Terminology (${r} sellers): Prefer German familiarity: Kraftstoff wording can pair with Benzin/Diesel labels, Tempo or Geschwindigkeit phrasing sparingly only if natural, TÜV when referring to HU inspection is normal. EUR pricing tone.`;
  }
  if (inGroup(regionName, REGION_GROUPS.euFr)) {
    return `Terminology (${r} sellers): Prefer French familiarity: essence/sans plomb wording for gasoline cars, contre-visite if discussing inspection rejects, CTL for technical inspection slang is fine. EUR pricing tone.`;
  }
  if (inGroup(regionName, REGION_GROUPS.euIt)) {
    return `Terminology (${r} sellers): Prefer Italian familiarity: revisione wording for inspections, benzina diesel labels, coupe vs coupé typography as natural typing allows. EUR pricing tone.`;
  }
  if (inGroup(regionName, REGION_GROUPS.euEs)) {
    return `Terminology (${r} sellers): Prefer Spanish familiarity: ITV for periodic inspection wording, gasolina/diésel for fuels. EUR pricing tone.`;
  }
  if (inGroup(regionName, REGION_GROUPS.euEn)) {
    return `Terminology (${r} sellers): Prefer European English familiarity: motorway, petrol, hatchback, tyre spellings with 'y'. EUR where relevant unless the valuation uses another seller currency already. Inspection names vary by country: keep wording generic unless the notes name one.`;
  }
  if (inGroup(regionName, REGION_GROUPS.apacJp)) {
    return `Terminology (${r} sellers): Shaken wording is normal for compulsory inspection on registered cars when relevant to the ITEM notes. Maintain polite keigo-light seller tone sparingly unless it reads stiff in English drafts.`;
  }
  if (inGroup(regionName, REGION_GROUPS.apacEa)) {
    return `Terminology (${r} sellers): Keep inspection and registration wording cautious unless spelled out in the ITEM notes because English marketplace copy varies greatly. Prefer neutral international English.`;
  }
  if (inGroup(regionName, REGION_GROUPS.apacGb)) {
    return `Terminology (${r} sellers): Often British-leaning vocabulary (petrol, boot, motorway) appears even outside the UK but avoid assuming MOT unless seller notes cite it or the region implies UK parallels. Mention kilometres plainly when odometers are metric-heavy.`;
  }
  if (inGroup(regionName, REGION_GROUPS.uae)) {
    return `Terminology (${r} sellers): Keep RTA wording only if factual in notes otherwise say registration and inspection plainly. AED currency from valuation context. Avoid guessing export plate rules.`;
  }
  if (inGroup(regionName, REGION_GROUPS.intlFallback)) {
    return `Terminology (${r} sellers): Keep neutral Brazilian marketplace Portuguese only if ITEM notes mix languages otherwise stay in clear International English paired with ${r} customs where obvious from currency. Avoid inventing bureaucracy names.`;
  }
  return `Terminology (${r} sellers): Use neutral marketplace English that locals expect. Mirror units already implied by the REGION and currency in the valuation. Do not guess region-specific paperwork names unless they appear in ITEM notes.`;
}
