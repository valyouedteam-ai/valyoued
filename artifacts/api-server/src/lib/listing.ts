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
    titleHint: "80 chars max, keyword-stuffed (brand, model, key spec, condition). All caps for key acronyms is fine.",
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
      ? `\nSTYLE: BASIC (free-tier). Plain, credible, modest length. Aim for roughly 650-950 characters body. Offer 4 photo tips maximum. Omit hype; one short negotiation note in proTips only (no hourly posting analytics). Keep proTips array to exactly 3 short bullets.`
      : `\nSTYLE: PREMIUM. Natural seller voice you'd see from an experienced reseller: persuasive but believable.\nProfessional plan (${plan}) commercial polish: sharper keyword coverage, completeness callouts${plan === "professional" ? ", and resale/stock-movement wording where appropriate." : "."}\nProduce 6-7 photoTips and 5 proTips unless the platform clearly doesn't suit them.`;

  const conversationalVoice = `
CONVERSATIONAL draftBody (required for all platforms; still follow platform profile for keywords and length):
- Open with a short friendly human line (for example "Hi" or "Hello" plus who you are as the seller, such as "Hi, I'm [name or 'the owner'] and I'm selling..."). Do not invent a real name if none was given: use "the owner", "I'm selling", or similar.
- Write the whole body in first person ("I'm asking...", "I've had it for...", "I'm happy to...") so it reads like a message to buyers, not a catalogue block.
- After the opener, say what the item is in plain words (brand, model, year if known).
- Include an explicit honesty section on physical condition and defects. Use a clear heading line such as "Condition and flaws:" or "Worth knowing:" then short sentences or bullets. If ITEM data lacks defect detail, summarise condition honestly from condition score and notes, and invite questions instead of guessing damage.
- Then cover what's included, your asking price (the TARGET LIST PRICE), and how you'd like pickup, shipping, or contact to work for the seller region.
`.trim();

  const platformChecklist = prerequisitesBlockForPlatform(args.platform);
  const localeTerms = sellerTerminologyPromptLine(i.currentRegion);

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

${localeTerms}

PLATFORM PREREQUISITES (mention truthfully using ITEM data only; never invent specifics)
Cover these buyer expectations naturally in prose or bullets: ${platformChecklist}
If ITEM data misses something important below, append a boldly labeled separate block at the VERY END:
Still need from seller:
- ...

${conversationalVoice}

PLATFORM PROFILE
- Audience: ${profile.audience}
- Tone rules: ${profile.toneRules}
- Title rules: ${profile.titleHint}
- Body rules: ${profile.bodyHint}

OUTPUT: STRICT JSON ONLY (no prose, no markdown fences):
{
  "draftTitle": string,    // ready to copy/paste into the platform's title field
  "draftBody": string,     // ready to copy/paste into the description box. Conversational first person with a clear condition/flaws section. Use \\n for line breaks. NO markdown.
  "photoTips": [           // 4-7 ordered shots the seller should upload, optimised for THIS asset class & platform
    {
      "angle": string,     // such as "Front 3/4 hero", "Serial number close-up", "Box and papers flat-lay"
      "description": string // 1 sentence on what to capture and why it boosts buyer trust
    }
  ],
  "hashtags": [string],    // 0-8 relevant hashtags. Empty array for platforms that don't use hashtags (eBay, AutoTrader, Rightmove).
  "proTips": [string]      // 3-5 short tactical tips for the seller (best time to post, response speed, negotiation guardrails). Specific to this item & platform.
}

CRITICAL: include the target price in the body as the asking price. Never invent serial numbers, model years, or specs that weren't given. Use only what's in the ITEM block above. Use realistic shipping/collection wording for the seller's region. Do not sound like a corporate template: keep the voice human and direct.`;

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

  return {
    draftTitle: parsed.draftTitle?.trim() ?? i.title,
    draftBody: parsed.draftBody?.trim() ?? "",
    suggestedPrice: Math.round(targetPrice),
    photoTips,
    hashtags: (parsed.hashtags ?? []).filter((h) => typeof h === "string" && h.trim() !== ""),
    proTips: (parsed.proTips ?? []).filter((t) => typeof t === "string" && t.trim() !== ""),
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
