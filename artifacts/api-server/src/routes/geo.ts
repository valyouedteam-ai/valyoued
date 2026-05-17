import { Router, type IRouter } from "express";
import type { Request } from "express";

/** 2-letter ISO 3166-1 alpha-2, or null if unknown / invalid. */
function countryFromHeaders(req: Request): { country: string | null; source: string } {
  const h = req.headers;
  const candidates: [string, string][] = [
    ["cf-ipcountry", "cf-ipcountry"],
    ["x-vercel-ip-country", "x-vercel-ip-country"],
    ["cloudfront-viewer-country", "cloudfront-viewer-country"],
  ];

  for (const [key, source] of candidates) {
    const raw = h[key];
    const val = Array.isArray(raw) ? raw[0] : raw;
    if (typeof val !== "string") continue;
    const c = val.trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(c) && c !== "XX" && c !== "T1") {
      return { country: c, source };
    }
  }
  return { country: null, source: "none" };
}

const router: IRouter = Router();

/**
 * Public geo hint for display currency (no auth). Uses reverse-proxy headers when present:
 * Cloudflare `cf-ipcountry`, Vercel `x-vercel-ip-country`, CloudFront `cloudfront-viewer-country`.
 * Local dev and plain hosts usually return `country: null`; the UI falls back to browser locale.
 */
router.get("/geo", (req, res) => {
  const { country, source } = countryFromHeaders(req);
  res.json({ country, source });
});

export default router;
