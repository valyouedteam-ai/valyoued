import type { VisionExtractInputMimeType } from "@workspace/api-client-react";

const HEIC_TYPES = new Set(["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"]);

export function isHeicLike(file: File): boolean {
  const type = (file.type ?? "").trim().toLowerCase();
  if (HEIC_TYPES.has(type)) return true;
  const name = file.name.toLowerCase();
  return name.endsWith(".heic") || name.endsWith(".heif");
}

async function loadHeic2Any() {
  const mod = await import("heic2any");
  return mod.default;
}

/** Normalize iPhone HEIC/HEIF uploads to JPEG for the vision API. */
export async function preparePhotoUploadFile(file: File): Promise<{ file: File; mimeType: VisionExtractInputMimeType }> {
  if (!isHeicLike(file)) {
    const mime = normalizeStandardMime(file);
    if (!mime) throw new Error("Unsupported file type");
    return { file, mimeType: mime };
  }

  try {
    const heic2any = await loadHeic2Any();
    const converted = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.92,
    });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    if (!(blob instanceof Blob)) {
      throw new Error("HEIC conversion failed");
    }
    const baseName = file.name.replace(/\.(heic|heif)$/i, "") || "photo";
    const jpegFile = new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
    return { file: jpegFile, mimeType: "image/jpeg" };
  } catch {
    throw new Error(
      "Could not read this iPhone photo format. Try choosing the photo from your library or take a new shot in Most Compatible (JPEG) mode.",
    );
  }
}

function normalizeStandardMime(file: File): VisionExtractInputMimeType | null {
  let raw = (file.type ?? "").trim().toLowerCase();
  if (raw === "image/jpg" || raw === "image/pjpeg" || raw === "image/x-citrix-jpeg") {
    raw = "image/jpeg";
  }
  const allowed: VisionExtractInputMimeType[] = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (allowed.includes(raw as VisionExtractInputMimeType)) {
    return raw as VisionExtractInputMimeType;
  }
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return null;
  }
}

export async function compressJpegIfLarge(file: File, maxBytes: number): Promise<File> {
  if (file.size <= maxBytes || file.type !== "image/jpeg") return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, Math.sqrt(maxBytes / file.size));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
}
