import { defaultModel, getLlm } from "@workspace/llm";
import type { AssetType } from "@workspace/api-zod";
import { logger } from "./logger";

export interface VisionExtractInput {
  assetType: AssetType;
  imageBase64: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
}

export interface VisionExtractOutput {
  extracted: Record<string, string>;
  confidence: number;
  notes: string;
  suggestedTitle?: string;
  detectedAssetTypeId?: string;
}

// Fields that should NEVER be auto-filled — the user must answer these themselves
// because they cannot be reliably determined from a single photograph.
const NON_VISUAL_KEYS = new Set([
  "year",
  "yearBought",
  "yearOfPurchase",
  "purchaseYear",
  "mileage",
  "odometer",
  "kilometres",
  "kilometers",
  "purchasePrice",
  "originalPrice",
  "boughtFor",
  "ownership",
  "owners",
  "previousOwners",
  "registrationYear",
  "modelYear",
  "serviceHistory",
  "warranty",
  "boxAndPapers",
  "originalReceipt",
  "tenure",
  "councilTax",
  "yearBuilt",
  "epcRating",
  "groundRent",
  "leaseLength",
]);

export async function extractAttributesFromPhoto(
  input: VisionExtractInput,
): Promise<VisionExtractOutput> {
  const visualFields = input.assetType.fields.filter(
    (f) => !NON_VISUAL_KEYS.has(f.key),
  );

  const fieldList = visualFields
    .map((f) => {
      const optionsHint =
        f.options && f.options.length > 0
          ? ` (must be one of: ${f.options.join(", ")})`
          : "";
      const typeHint = f.type === "number" ? " (number)" : "";
      return `  - ${f.key}: ${f.label}${typeHint}${optionsHint}`;
    })
    .join("\n");

  const prompt = `You are ValYoued's photo-analysis expert. Look at this photograph of a ${input.assetType.name.toLowerCase()} and extract any attributes you can identify with HIGH confidence.

You MUST return STRICT JSON only, with this exact shape:
{
  "extracted": { "<fieldKey>": "<value>", ... },
  "confidence": 0.0 to 1.0,
  "notes": "1-2 sentences describing what you see (condition, color, distinguishing features)",
  "suggestedTitle": "A short, marketplace-ready title for this item (such as 'Rolex Submariner Date 116610LN, black dial')"
}

Available fields you may fill (skip any field where you are not confident — DO NOT GUESS):
${fieldList}

CRITICAL RULES:
1. Only include fields in "extracted" when you are visually confident from the photo.
2. For select fields, the value MUST exactly match one of the listed options (case-sensitive).
3. For number fields, return a numeric string (use "44" not "44mm").
4. NEVER include keys that are not in the list above.
5. NEVER guess year-of-purchase, mileage, or original price — those need owner input.
6. If the photo is blurry, generic, or doesn't clearly show a ${input.assetType.name.toLowerCase()}, return an empty extracted object and set confidence to 0.
7. The "notes" field should describe condition signals (scratches, wear, completeness) the buyer would care about.
8. "notes" and "suggestedTitle" MUST be JSON strings (never numbers or null).
9. NO prose before or after the JSON. NO markdown fences.`;

  let raw: string;
  try {
    const llm = getLlm();
    raw = await llm.complete({
      model: defaultModel(),
      maxTokens: 8192,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              base64: input.imageBase64,
              mimeType: input.mimeType,
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    });
  } catch (err) {
    logger.error({ err }, "Vision extraction failed");
    throw err;
  }

  // Tolerant parse: strip code fences if present
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    logger.error({ err, raw }, "Failed to parse vision JSON");
    return {
      extracted: {},
      confidence: 0,
      notes: "Could not analyze the image automatically — please fill the form manually.",
    };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    logger.error({ parsed }, "Vision JSON was not an object");
    return {
      extracted: {},
      confidence: 0,
      notes: "Could not analyze the image automatically — please fill the form manually.",
    };
  }

  const p = parsed as Record<string, unknown>;
  const rawExtracted = p.extracted;
  const extractedSource =
    rawExtracted && typeof rawExtracted === "object" && !Array.isArray(rawExtracted)
      ? (rawExtracted as Record<string, unknown>)
      : {};

  const validKeys = new Set(visualFields.map((f) => f.key));
  const extracted: Record<string, string> = {};
  for (const [k, v] of Object.entries(extractedSource)) {
    if (!validKeys.has(k)) continue;
    if (v == null) continue;
    const str = String(v).trim();
    if (str === "" || str.toLowerCase() === "unknown" || str.toLowerCase() === "n/a") continue;
    extracted[k] = str;
  }

  let confidence = 0.5;
  if (typeof p.confidence === "number" && Number.isFinite(p.confidence)) {
    confidence = Math.max(0, Math.min(1, p.confidence));
  }

  const notes =
    typeof p.notes === "string"
      ? p.notes
      : p.notes != null && typeof p.notes !== "object"
        ? String(p.notes)
        : "";

  let suggestedTitle: string | undefined;
  if (typeof p.suggestedTitle === "string") {
    const t = p.suggestedTitle.trim();
    suggestedTitle = t || undefined;
  }

  return {
    extracted,
    confidence,
    notes,
    suggestedTitle,
  };
}
