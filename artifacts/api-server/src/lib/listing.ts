import { defaultModel, getLlm } from "@workspace/llm";
import type { EstimateResult, PhotoTip } from "@workspace/api-zod";
import { logger } from "./logger";
import {
  prerequisitesBlockForPlatform,
  sellerTerminologyPromptLine,
} from "@workspace/marketplace-regions";

export type Platform =
  | "facebook-marketplace"
  | "ebay"
  | "gumtree"
  | "craigslist"
  | "depop"
  | "vinted"
  | "vestiaire-collective"
  | "autotrader"
  | "chrono24"
  | "rightmove";

export type PriceStrategy = "quick-sale" | "market" | "premium";

interface PlatformProfile {
  name: string;
  audience: string;
  toneRules: string;
  titleHint: string;
  bodyHint: string;
}

const PROFILES: Record<Platform, PlatformProfile> = {
  "facebook-marketplace": {
    name: "Facebook Marketplace",
    audience: "Local buyers, casual browsers, families",
    toneRules:
      "Casual, friendly, first-person. No hype. Mention pickup/delivery and cash/PayPal acceptance. Keep it skimmable.",
    titleHint: "70 chars max, plain words, no emojis. Lead with brand + model.",
    bodyHint: "Short paragraphs, plain text, no markdown. End with collection location and contact preference.",
  },
  ebay: {
    name: "eBay",
    audience: "Bargain hunters, collectors, international buyers",
    toneRules:
      "Search-friendly keywords woven into natural first-person sentences (not a cold spec dump). Include condition grade, dimensions, completeness (box, papers, accessories). Mention returns policy.",
    titleHint:
      "80 chars max, keyword-stuffed (brand, model, key spec). Never put numeric condition scores or N/10 in the title. All caps for key acronyms is fine.",
    bodyHint:
      "Open with a short friendly seller line, then cover item, condition and defects, what's included, shipping, returns. Bullets are fine where they help.",
  },
  gumtree: {
    name: "Gumtree",
    audience: "UK local buyers",
    toneRules: "Direct, plain English, mention collection location and cash-on-collection.",
    titleHint: "Brand model with location hint, such as 'Rolex Submariner, N. London'.",
    bodyHint: "Plain text, short. State why selling, condition, and that you're open to viewing.",
  },
  craigslist: {
    name: "Craigslist",
    audience: "US local buyers, no-frills",
    toneRules: "Plain, terse, no-nonsense. Mention cash-only / firm-or-OBO.",
    titleHint: "Brand + model + size/year. Keep under 70 chars.",
    bodyHint: "Plain ASCII paragraphs, no markdown. End with city / cross-streets and 'cash only, serious buyers'.",
  },
  depop: {
    name: "Depop",
    audience: "Gen-Z fashion buyers, trend-driven",
    toneRules: "Trendy, lowercase-friendly, vibe-led. Use 4-6 hashtags. Reference style era / aesthetic.",
    titleHint: "Vibe-led, such as 'y2k coach saddle bag in chocolate'.",
    bodyHint: "Short, energetic. Hashtag block at the end.",
  },
  vinted: {
    name: "Vinted",
    audience: "Resale-focused fashion buyers, mostly Europe",
    toneRules: "Honest condition disclosure, sustainability angle, friendly. List measurements.",
    titleHint: "Brand + item type + size, such as 'Levi’s 501 jeans W30 L32'.",
    bodyHint: "Bullet measurements, condition, reason for sale. End with shipping note.",
  },
  "vestiaire-collective": {
    name: "Vestiaire Collective",
    audience: "Luxury resale buyers, authentication-aware",
    toneRules:
      "Polished luxury tone with a brief personal seller line. Stress provenance, authenticity, completeness, original price.",
    titleHint: "Brand, model name, material, color. Title-case.",
    bodyHint: "Short human intro, then purchase year if known, original retail, honest condition, included items.",
  },
  autotrader: {
    name: "AutoTrader",
    audience: "Serious car buyers",
    toneRules:
      "Spec-led and credible. One short first-person intro is fine, then service history, MOT, key features, mileage, owner count. No emojis.",
    titleHint: "Year Make Model Trim, such as '2019 BMW M2 Competition DCT'.",
    bodyHint: "Personal intro if natural, then history, condition and any known issues, mods, paperwork, viewing.",
  },
  chrono24: {
    name: "Chrono24",
    audience: "Watch collectors worldwide, authentication-aware",
    toneRules:
      "Knowledgeable collector-to-collector voice in first person. Reference number, year, movement, case material, completeness (box, papers, warranty card), service history.",
    titleHint: "Brand Model Reference (such as 'Rolex Submariner 116610LN').",
    bodyHint: "Friendly opener, then detailed honest condition, specs, history, photos-on-request, escrow-friendly note.",
  },
  rightmove: {
    name: "Rightmove",
    audience: "Property buyers and renters",
    toneRules:
      "Warm, readable estate-style prose. You may start with a short seller line (for example why you're moving) if it fits, then lifestyle, neighborhood, key features, EPC. No price flexibility implied.",
    titleHint: "Bedroom count + property type + neighborhood, such as '3-bed terrace, Hampstead'.",
    bodyHint: "Hook, room highlights, transport, EPC/tenure, viewing. Clear on condition and any known issues.",
  },
};

const STRATEGY_LABEL: Record<PriceStrategy, string> = {
  "quick-sale": "Aggressive: price ~10% under the market-adjusted estimate to move it fast",
  market: "Fair: price at the market-adjusted estimate",
  premium: "Patient: price ~8% above the market-adjusted estimate to leave room for offers",
};

export interface GenerateListingArgs {
  estimate: EstimateResult;
  platform: Platform;
  priceStrategy: PriceStrategy;
  /** Free Everyday = tighter copy & fewer tactical tips vs paid */
  listingQuality?: "basic" | "premium";
  stripePlanSlug?: "none" | "everyday_plus" | "professional";
}

export interface GeneratedListing {
  draftTitle: string;
  draftBody: string;
  suggestedPrice: number;
  photoTips: PhotoTip[];
  hashtags: string[];
  proTips: string[];
}

/** Strip numeric condition fractions (such as "9/10") from marketplace titles; condition belongs in the body. */
export function sanitizeListingDraftTitle(title: string): string {
  let t = title.trim();
  if (!t) return t;
  // Phrases like "condition 9/10", "cond 8 / 10"
  t = t.replace(/\bcond(?:ition)?\.?\s*\d{1,2}\s*\/\s*10\b/gi, "");
  // Parenthetical or bare "9/10" style scores on our 1-10 wizard scale only
  t = t.replace(/\(?\s*\d{1,2}\s*\/\s*10\s*\)?/g, "");
  // Tidy duplicated punctuation and whitespace left behind
  t = t.replace(/\s*[-–,;:|]\s*(?:[-–,;:|]\s*)+/g, ", ");
  t = t.replace(/\s{2,}/g, " ").trim();
  t = t.replace(/^[-–,;:,|.\s]+|[-–,;:,|.\s]+$/g, "").trim();
  return t;
}

/**
 * Cuts off internal seller checklists sometimes emitted by older prompts; they must not ship in marketplace copy.
 */
export function stripSellerTodoBlockFromDraftBody(body: string): string {
  const b = typeof body === "string" ? body.trimEnd() : "";
  if (!b) return "";
  const idx = b.toLowerCase().indexOf("still need from seller");
  if (idx < 0) return b;
  return b.slice(0, idx).replace(/[\s\r\n]+$/u, "").trimEnd();
}

/** Drop tips that rely on vague lifecycle advice unrelated to THIS item/class/platform. */
function isGenericSellerTip(line: string): boolean {
  const t = line.toLowerCase().trim();
  if (t.length < 12) return true;
  const clichés = [
    "respond promptly",
    "build trust",
    "peak browsing",
    "late afternoon",
    "maximize visibility",
    "maximise visibility",
    "fair market valuation",
    "fair market val",
    "open to reasonable offer",
    "firm with the asking price",
    "firm with your asking price",
    "firm on the asking price",
    "but be open to reasonable",
    "during peak browsing",
    "list on a weekday",
    "listing on a weekday",
    "encourage quick sales",
    "maximize buyer",
    "maximise buyer",
  ];
  if (clichés.some((c) => t.includes(c))) return true;
  // Obvious filler when two generic moves appear together without item nouns beyond "buyer"
  if (/buyers?\b/i.test(t) && /weekday|afternoon|visibility|firm with|reasonable offer/i.test(t)) {
    const hasConcrete =
      /\b(rolex|cartier|omega|bmw|audi|apple|iphone|ipad|studio|birkin|neverfull|chrono|mileage|box|papers|certificate|dimensions|edition|authenticat|movement|kilomet|serial|sku|mot|tax|duty|ebay|vestiaire|chrono24)\b/i.test(
        t,
      );
    if (!hasConcrete) return true;
  }
  return false;
}

function filterProTips(tips: string[]): string[] {
  return tips.map((x) => x.trim()).filter((t) => t.length > 0 && !isGenericSellerTip(t));
}

function valuationHintsForSellingTips(e: EstimateResult): string {
  const comps = e.comparables?.slice(0, 5) ?? [];
  const anchorBlock =
    comps.length === 0
      ? "  (no comparable sale rows attached to this estimate)"
      : comps
          .map(
            (c, idx) =>
              `  ${idx + 1}. ${c.source}${c.year != null ? ` ${c.year}` : ""}: ${c.description} at ${Math.round(Number(c.price))} ${e.currency}`,
          )
          .join("\n");

  const arbRows = e.arbitrage?.slice(0, 4) ?? [];
  const arbBlock =
    arbRows.length === 0
      ? "  (no cross-region payout rows attached)"
      : arbRows
          .map(
            (r) =>
              `  - ${r.region} / ${r.marketplace}${r.recommended ? " [model suggests stronger payout]" : ""}: ${r.demandNote}`,
          )
          .join("\n");

  return `
VALUATION SIGNALS FOR SELLING TIPS (context only)
Use these anchors to write proTips where helpful. Never claim "this identical item sold for X" unless the listing body already states that; phrases like "comps in similar condition often cluster near ..." may reference anchors below together with valuation bands.
Comparable-style anchors (from the valuation run):
${anchorBlock}

Regional payout / demand notes (model output; not verbatim listing claims):
${arbBlock}

Best region hint (headline heuristic only): ${e.bestArbitrageRegion ?? "n/a"}
`.trim();
}

export async function generateListingDraft(
  args: GenerateListingArgs,
): Promise<GeneratedListing> {
  const profile = PROFILES[args.platform];
  if (!profile) {
    throw new Error(`Unsupported platform: ${args.platform}`);
  }

  const e = args.estimate;
  const i = e.input;
  const ccy = e.currency;
  const targetPrice = computeTargetPrice(e.adjustedMid, args.priceStrategy);

  const extras = i.extraFields
    ? Object.entries(i.extraFields)
        .filter(([, v]) => v && String(v).trim() !== "")
        .map(([k, v]) => `  - ${k}: ${v}`)
        .join("\n")
    : "(none)";

  const quality = args.listingQuality ?? "premium";
  const plan = args.stripePlanSlug ?? "none";
  const qualityBlock =
    quality === "basic"
      ? `\nSTYLE: BASIC (free-tier). Plain, credible, modest length. Aim for roughly 650-950 characters body. Offer 4 photo tips maximum. Omit hype.\nproTips: MUST be an empty JSON array [] (no seller tip bullets).`
      : `\nSTYLE: PREMIUM. Natural seller voice you'd see from an experienced reseller: persuasive but believable.\nProfessional plan (${plan}) commercial polish: sharper keyword coverage, and concise callouts for accessories or completeness only when ITEM explicitly lists them${plan === "professional" ? ", plus resale or stock-movement wording where appropriate." : "."}\nProduce 6-7 photoTips. For proTips follow the SEPARATE proTips RULES section (strict): never generic "life hacks".`;

  const conversationalVoice = `
CONVERSATIONAL draftBody (required for all platforms; still follow platform profile for keywords and length):
- Open with a short friendly human line (for example "Hi" or "Hello" plus who you are as the seller, such as "Hi, I'm [name or 'the owner'] and I'm selling..."). Do not invent a real name if none was given: use "the owner", "I'm selling", or similar.
- Write the whole body in first person ("I'm asking...", "I've had it for...", "I'm happy to...") so it reads like a message to buyers, not a catalogue block.
- After the opener, say what the item is in plain words (brand, model, year if known).
- Include an honest section on physical condition and defects **only using what ITEM and owner notes actually say**. Use a clear heading line such as "Condition and flaws:" or "Worth knowing:" then short sentences or bullets. Never invent damage. Never say that defect detail is thin, incomplete, unknown, or "ask me because it is not listed"; if specifics are lacking, summarise only what the condition score and notes support in neutral terms, without calling attention to missing detail.
- Then cover what is included (only if ITEM gives it), your asking price (the TARGET LIST PRICE), and how you would like pickup, shipping, or contact to work for the seller region.
`.trim();

  const platformChecklist = prerequisitesBlockForPlatform(args.platform);
  const localeTerms = sellerTerminologyPromptLine(i.currentRegion);

  const researchBlock = valuationHintsForSellingTips(e);

  const proTipsRules =
    quality === "basic"
      ? `proTips RULES:\nReturn "proTips": [].`
      : `proTips RULES (premium only):
Each bullet MUST either (1) weave in a concrete detail from ITEM (brand, model, year, defects, completeness, authenticity, region) together with HOW buyers evaluate that on ${profile.name}, OR (2) turn one line from VALUATION SIGNALS into a specific listing tactic (pricing band placement, geography, escrow/shipping caveat, authenticity evidence to show buyers) without inventing URLs or sale prices not present in anchors.
Forbidden patterns (reject yourself; emit [] if nothing good remains): "post/weekday/time of day/browsing/peaks/respond promptly/build trust/quick sales/firm on asking/open to reasonable offers/fair market valuation/maximize visibility" without naming THIS asset class, THIS platform workflow, AND a non-obvious move.
Prefer 3-5 bullets; use [] rather than fillers.`;

  const prompt = `You are a senior copywriter for ${profile.name}. Write a high-converting listing for the item below.

ITEM
- Asset class: ${e.assetType.name}
- Title: ${i.title}
- Brand: ${i.brand ?? "n/a"}
- Model: ${i.model ?? "n/a"}
- Year: ${i.year ?? "n/a"}
- Condition (1-10): ${i.condition}
- Region: ${i.currentRegion}
- Currency: ${ccy}
- Owner notes: ${i.attributes ?? "n/a"}
- Asset details:
${extras}

VALUATION CONTEXT (do NOT include in the listing; for your context only)
- Baseline market value: ${ccy} ${Math.round(e.baselineMid).toLocaleString()}
- Market-adjusted value (today): ${ccy} ${Math.round(e.adjustedMid).toLocaleString()}
- TARGET LIST PRICE for this draft: ${ccy} ${Math.round(targetPrice).toLocaleString()}
- Pricing strategy: ${STRATEGY_LABEL[args.priceStrategy]}
${qualityBlock}

${researchBlock}

${proTipsRules}

${localeTerms}

PLATFORM PREREQUISITES (use ITEM facts only)
Work relevant buyer expectations from this list naturally into conversational prose where you actually have facts. Do not invent specifics.
Checklist (${args.platform}): ${platformChecklist}
The listing must read as buyer-facing copy ready to paste. Never end with or insert a labelled seller to-do section (for example lines starting with "Still need from seller" or markdown such as "**Still need from seller:**" followed by bullet lists of missing MOT, paperwork, keys, postcode, specs, or similar).
OMISSIONS: If ITEM does not include a fact, do not mention that fact at all. Do not apologise for gaps, do not say you are unsure, do not invite messages or DMs specifically to supply details that are absent from ITEM, and do not use phrases like "not included here", "TBC", "to follow", "I do not have", or "drop me a line for X" when X was never in ITEM. Stay silent on missing topics; write only from what is present.

${conversationalVoice}

PLATFORM PROFILE
- Audience: ${profile.audience}
- Tone rules: ${profile.toneRules}
- Title rules: ${profile.titleHint}
- Body rules: ${profile.bodyHint}

OUTPUT: STRICT JSON ONLY (no prose, no markdown fences):
{
  "draftTitle": string,    // marketplace title field: NEVER put condition as N/10 or numeric score here
  "draftBody": string,     // paste-ready buyer copy. Conversational first person. NO markdown headings. NEVER include "Still need from seller" blocks or QA checklists. Only state facts present in ITEM; never call out missing information. Use \\n for line breaks only.
  "photoTips": [           // 4-7 ordered shots the seller should upload, optimised for THIS asset class & platform
    {
      "angle": string,     // such as "Front 3/4 hero", "Serial number close-up", "Box and papers flat-lay"
      "description": string // 1 sentence on what to capture and why it boosts buyer trust
    }
  ],
  "hashtags": [string],    // 0-8 relevant hashtags. Empty array for platforms that don't use hashtags (eBay, AutoTrader, Rightmove).
  "proTips": [string]      // BASIC: [] only. PREMIUM: see proTips RULES (empty array if unsure).
}

CRITICAL: include the target price in the body as the asking price. Never invent serial numbers, model years, or specs that weren't given. Use only what's in the ITEM block above. Use realistic shipping/collection wording for the seller's region. Do not sound like a corporate template: keep the voice human and direct.
Never put "**Still need from seller:**", "Still need from seller:", or similar seller checklists in draftBody.
Do not make missing information obvious: omit any topic that is not in ITEM; no apologies, no "not sure", no highlighting gaps.

TITLE: draftTitle must NOT contain numeric condition scores or fractions (no "9/10", "8/10", "condition 7/10", or similar). Put condition only in draftBody using honest words.`;

  let raw: string;
  try {
    const llm = getLlm();
    raw = await llm.complete({
      model: defaultModel(),
      maxTokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });
  } catch (err) {
    logger.error({ err }, "Listing generation failed");
    throw err;
  }

  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed: {
    draftTitle?: string;
    draftBody?: string;
    photoTips?: Array<{ angle?: string; description?: string }>;
    hashtags?: string[];
    proTips?: string[];
  };
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    logger.error({ err, raw }, "Failed to parse listing JSON");
    throw new Error("Could not parse listing draft response");
  }

  const photoTips: PhotoTip[] = (parsed.photoTips ?? [])
    .filter((p): p is { angle: string; description: string } => !!p?.angle && !!p?.description)
    .map((p) => ({ angle: p.angle, description: p.description }));

  const rawProTips = (parsed.proTips ?? []).filter((t) => typeof t === "string" && t.trim() !== "");
  const proTips = quality === "basic" ? [] : filterProTips(rawProTips);

  const rawTitle = (parsed.draftTitle?.trim() || i.title?.trim() || "").trim();
  let draftTitle = sanitizeListingDraftTitle(rawTitle);
  if (draftTitle.length < 3) {
    draftTitle = sanitizeListingDraftTitle(`${i.brand ?? ""} ${i.model ?? ""}`.trim());
  }
  if (draftTitle.length < 3) {
    draftTitle = sanitizeListingDraftTitle(e.assetType.name.trim()) || "Listing";
  }

  return {
    draftTitle,
    draftBody: stripSellerTodoBlockFromDraftBody(parsed.draftBody?.trim() ?? ""),
    suggestedPrice: Math.round(targetPrice),
    photoTips,
    hashtags: (parsed.hashtags ?? []).filter((h) => typeof h === "string" && h.trim() !== ""),
    proTips,
  };
}

function computeTargetPrice(adjustedMid: number, strategy: PriceStrategy): number {
  switch (strategy) {
    case "quick-sale":
      return adjustedMid * 0.9;
    case "premium":
      return adjustedMid * 1.08;
    case "market":
    default:
      return adjustedMid;
  }
}
