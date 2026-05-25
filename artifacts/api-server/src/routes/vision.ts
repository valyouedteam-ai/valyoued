import { Router, type IRouter } from "express";
import { ExtractFromPhotoBody, ExtractFromPhotoResponse } from "@workspace/api-zod";
import { getAssetType } from "../lib/assetTypes";
import { extractAttributesFromPhoto } from "../lib/vision";
import { logger } from "../lib/logger";
import { rateLimit } from "../lib/rateLimit";
import { getUserId } from "../middlewares/requireAuth";
import { recordPlatformEvent } from "../lib/platformEvents";

const router: IRouter = Router();

// Vision calls are expensive (Anthropic image input). Cap at 8 per minute per IP.
// Open to signed-out guests (e.g. /start) so photo auto-fill works before sign-up; authenticated userId is logged when present.
const visionLimit = rateLimit({
  windowMs: 60_000,
  max: 8,
  message: "Too many photo analyses in a row: please wait a minute and try again.",
});

router.post("/vision/extract", visionLimit, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const body = ExtractFromPhotoBody.safeParse(req.body);
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

  try {
    const result = await extractAttributesFromPhoto({
      assetType,
      imageBase64: body.data.imageBase64,
      mimeType: body.data.mimeType,
    });

    res.json(
      ExtractFromPhotoResponse.parse({
        extracted: result.extracted,
        confidence: result.confidence,
        notes: result.notes,
        suggestedTitle: result.suggestedTitle,
      }),
    );
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
    res.status(502).json({
      error: "Could not analyze the image. Try again or fill the form manually.",
    });
  }
});

export default router;
