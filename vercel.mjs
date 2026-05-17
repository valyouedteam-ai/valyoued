/**
 * Programmatic Vercel config (replaces vercel.json).
 * When VITE_API_ORIGIN or VERCEL_VALUATION_API_ORIGIN is set on Vercel, `/api/*` is rewritten
 * to the real valuation API so the SPA is not served HTML for JSON routes.
 *
 * Add the same origin in Vercel → Settings → Environment Variables, then redeploy.
 * Include `https://` (or we prepend it for host-only values like `*.up.railway.app`).
 */

function normalizeApiOrigin(raw) {
  if (raw == null) return "";
  let s = String(raw).trim();
  if (!s) return "";
  s = s.replace(/\/$/, "");
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return s;
  if (s.startsWith("//")) return `https:${s}`;
  const isLocal =
    /^localhost\b/i.test(s) || /^127\.0\.0\.1\b/.test(s) || /^\[::1\]/.test(s);
  return `${isLocal ? "http" : "https"}://${s}`;
}

export const config = (() => {
  const raw =
    process.env.VITE_API_ORIGIN?.trim() ||
    process.env.VERCEL_VALUATION_API_ORIGIN?.trim() ||
    "";
  const apiOrigin = normalizeApiOrigin(raw);

  const spa = { source: "/(.*)", destination: "/index.html" };

  if (!apiOrigin) {
    console.warn(
      "[vercel] VITE_API_ORIGIN is unset — /api/* will serve the SPA (broken API calls). " +
        "Set VITE_API_ORIGIN to your API origin on Vercel and redeploy.",
    );
    return {
      installCommand: "pnpm install",
      buildCommand: "pnpm --filter @workspace/valuation-app run build",
      outputDirectory: "artifacts/valuation-app/dist/public",
      framework: null,
      rewrites: [spa],
    };
  }

  return {
    installCommand: "pnpm install",
    buildCommand: "pnpm --filter @workspace/valuation-app run build",
    outputDirectory: "artifacts/valuation-app/dist/public",
    framework: null,
    rewrites: [
      { source: "/api/(.*)", destination: `${apiOrigin}/api/$1` },
      spa,
    ],
  };
})();
