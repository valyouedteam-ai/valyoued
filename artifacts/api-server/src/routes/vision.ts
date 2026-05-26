import { Router, type IRouter } from "express";
import { ExtractFromPhotoBody, ExtractFromPhotoResponse } from "@workspace/api-zod";
import { isLlmConfigured } from "@workspace/llm";
import { getAssetType } from "../lib/assetTypes";
import { extractAttributesFromPhoto, type VisionExtractOutput } from "../lib/vision";
import { logger } from "../lib/logger";
import { rateLimit } from "../lib/rateLimit";
import { getUserId } from "../middlewares/requireAuth";
import { recordPlatformEvent } from "../lib/platformEvents";

const router: IRouter = Router();

function buildSanitizedVisionResponse(result: VisionExtractOutput) {
  const extracted: Record<string, string> = {};
  for (const [k, v] of Object.entries(result.extracted ?? {})) {
    if (typeof k !== "string" || typeof v !== "string") continue;
    const vv = v.trim();
    if (vv.length === 0) continue;
    extracted[k] = vv.length > 10_000 ? vv.slice(0, 10_000) : vv;
  }

  const confidence =
    typeof result.confidence === "number" && Number.isFinite(result.confidence)
      ? Math.min(1, Math.max(0, result.confidence))
      : 0.5;

  const notesRaw = typeof result.notes === "string" ? result.notes : "";
  const notes = notesRaw.length > 20_000 ? notesRaw.slice(0, 20_000) : notesRaw;

  const parsed = ExtractFromPhotoResponse.safeParse({
    extracted,
    confidence,
    notes,
    ...(typeof result.suggestedTitle === "string" && result.suggestedTitle.trim() !== ""
      ? { suggestedTitle: result.suggestedTitle.trim().slice(0, 400) }
      : {}),
  });

  if (parsed.success) return parsed.data;

  logger.warn(
    { issues: parsed.error.flatten() },
    "Vision response missed OpenAPI/zod constraints; falling back to a minimal envelope",
  );
  const minimal = ExtractFromPhotoResponse.safeParse({
    extracted: {},
    confidence: 0,
    notes: notes ? notes.slice(0, 2000) : "Fill in the fields manually.",
  });
  return minimal.success
    ? minimal.data
    : { extracted: {}, confidence: 0, notes: "Fill in the fields manually." };
}

/** Unauthenticated: confirms this revision serves `POST /api/vision/extract` without `requireAuth`. */
router.get("/vision/status", (_req, res): void => {
  res.json({
    postExtractRequiresSession: false,
    llmConfigured: isLlmConfigured(),
  });
});

// Vision calls are expensive (Anthropic image input). Cap at 8 per minute per IP.
// Open to signed-out guests (e.g. /start) so photo auto-fill works before sign-up; authenticated userId is logged when present.
const visionLimit = rateLimit({
  windowMs: 60_000,
  max: 8,
  message: "Too many photo analyses in a row: please wait a minute and try again.",
});

router.post("/vision/extract", visionLimit, async (req, res): Promise<void> => {
  const userId = getUserId(req);

  const normalizedBody =
    req.body && typeof req.body === "object" && typeof (req.body as { mimeType?: unknown }).mimeType === "string"
      ? {
          ...(req.body as Record<string, unknown>),
          mimeType: String((req.body as { mimeType: string }).mimeType).replace(/^image\/jpg$/i, "image/jpeg"),
        }
      : req.body;

  const body = ExtractFromPhotoBody.safeParse(normalizedBody);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const assetType = getAssetType(body.data.assetTypeId);
  if (!assetType) {
    res.status(400).json({ error: "Unknown assetTypeId" });
    return;
  }

  // Sanity check the base64 size (provider image caps around 5MB per image)
  // and our body cap is 12MB. Reject anything obviously too big with a clear msg.
  if (body.data.imageBase64.length > 8 * 1024 * 1024) {
    res
      .status(413)
      .json({ error: "Image is too large. Please upload a photo under 6MB." });
    return;
  }

  if (!isLlmConfigured()) {
    logger.warn("POST /vision/extract: no LLM vendor keys on this host (set ANTHROPIC_API_KEY, OPENAI_API_KEY, or LLM_API_KEY)");
    res.status(503).json({
      error:
        "Photo auto-fill is turned off on this server because no AI API key is configured. You can still fill the form manually.",
      code: "VISION_LLM_NOT_CONFIGURED",
    });
    return;
  }

  try {
    const result = await extractAttributesFromPhoto({
      assetType,
      imageBase64: body.data.imageBase64,
      mimeType: body.data.mimeType,
    });

    res.json(buildSanitizedVisionResponse(result));
    void recordPlatformEvent({
      userId,
      eventType: "vision.extracted",
      payload: {
        assetTypeId: body.data.assetTypeId,
        confidence: result.confidence,
        detectedAssetTypeId: result.detectedAssetTypeId ?? undefined,
      },
    });
  } catch (err) {
    const extra =
      err && typeof err === "object"
        ? {
            name: "name" in err ? String((err as { name?: unknown }).name) : undefined,
            message: "message" in err ? String((err as { message?: unknown }).message) : undefined,
            status:
              "status" in err && (err as { status?: unknown }).status != null
                ? Number((err as { status?: unknown }).status)
                : undefined,
            code: "code" in err ? String((err as { code?: unknown }).code) : undefined,
          }
        : {};
    logger.error({ err, ...extra }, "Vision extraction error");

    const msg = extra.message ?? "";
    const looksLikeMissingKey =
      /ANTHROPIC_API_KEY|OPENAI_API_KEY|LLM_API_KEY|LLM_PROVIDER must be|Anthropic: set|OpenAI: set/i.test(
        msg,
      );
    if (looksLikeMissingKey) {
      res.status(503).json({
        error:
          "Photo auto-fill is turned off on this server because the AI provider is not configured correctly. You can still fill the form manually.",
        code: "VISION_LLM_NOT_CONFIGURED",
      });
      return;
    }

    res.status(502).json({
      error: "Could not analyze the image. Try again or fill the form manually.",
    });
  }
});

export default router;
