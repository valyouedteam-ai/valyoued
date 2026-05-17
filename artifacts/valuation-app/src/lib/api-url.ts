/**
 * When the UI is on Vercel and the API elsewhere (Railway, Fly, Render, etc.), set
 * `VITE_API_ORIGIN=https://your-api-host.example` so all `/api/...` calls target the backend.
 *
 * If you omit `https://`, the browser treats the value as a **path** on the current site
 * (e.g. `valyoued.vercel.app/your-host.../api/...`) and you'll get HTML instead of JSON.
 */
export function normalizeApiOrigin(raw: string | undefined | null): string {
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

export function getApiOrigin(): string {
  const raw = import.meta.env.VITE_API_ORIGIN as string | undefined;
  return normalizeApiOrigin(raw);
}

export function apiUrl(path: string): string {
  const origin = getApiOrigin();
  const p = path.startsWith("/") ? path : `/${path}`;
  return origin ? `${origin}${p}` : p;
}

export function apiFetchCredentials(): RequestCredentials {
  return getApiOrigin() ? "include" : "same-origin";
}
