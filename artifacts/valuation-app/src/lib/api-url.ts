/**
 * When the UI is on Vercel and the API elsewhere (Railway, Fly, Render, etc.), set
 * `VITE_API_ORIGIN=https://your-api-host.example` so all `/api/...` calls target the backend.
 */
export function getApiOrigin(): string {
  const raw = import.meta.env.VITE_API_ORIGIN as string | undefined;
  return raw?.replace(/\/$/, "") ?? "";
}

export function apiUrl(path: string): string {
  const origin = getApiOrigin();
  const p = path.startsWith("/") ? path : `/${path}`;
  return origin ? `${origin}${p}` : p;
}

export function apiFetchCredentials(): RequestCredentials {
  return getApiOrigin() ? "include" : "same-origin";
}
