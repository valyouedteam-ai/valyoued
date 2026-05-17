import { ApiError, ResponseParseError } from "@workspace/api-client-react";

/** Explains classification fetch failures (HTTP 5xx is not always "can't reach backend"). */
export function AssetCategoriesLoadHint({ error }: { error: unknown }) {
  if (error instanceof ResponseParseError) {
    const raw = error.rawBody.trimStart();
    const looksLikeSpa =
      raw.startsWith("<!") || raw.toLowerCase().startsWith("<html");
    if (looksLikeSpa) {
      return (
        <span className="block mt-1 opacity-90 font-normal text-balance">
          The URL returned the web app (HTML) instead of API JSON — usual when the UI is deployed without{" "}
          <code className="text-xs px-1 rounded bg-background/50">VITE_API_ORIGIN</code> set to your valuation
          API origin. Add it in Vercel (or your host) env, redeploy the frontend, and ensure{" "}
          <code className="text-xs px-1 rounded bg-background/50">/api/asset-types</code> is served by the
          backend, not the SPA.
        </span>
      );
    }
  }

  if (error instanceof ApiError) {
    const st = error.status;
    if (st >= 500 && st <= 599) {
      return (
        <span className="block mt-1 opacity-90 font-normal text-balance">
          The browser reached your API, but the server failed (HTTP {st}). Check the terminal where{" "}
          <code className="text-xs px-1 rounded bg-background/50">api-server</code> runs. Common local causes are a missing or wrong{" "}
          <code className="text-xs px-1 rounded bg-background/50">DATABASE_URL</code>, Postgres not running, or an uncaught backend error.
          Routing is usually fine when you see HTTP 500; fix the API process rather than only Vite proxy settings.
        </span>
      );
    }
    if (st >= 400 && st < 500) {
      return (
        <span className="block mt-1 opacity-90 font-normal text-balance">
          The API refused the request (HTTP {st}). Confirm <code className="text-xs px-1 rounded bg-background/50">VITE_API_ORIGIN</code> points at this
          project&apos;s valuation API if you deploy the UI separately, and that nothing in front strips <code className="text-xs px-1 rounded bg-background/50">/api</code> routes.
        </span>
      );
    }
  }

  const message = error instanceof Error ? error.message : String(error ?? "");
  const networkish =
    error instanceof TypeError ||
    /\bfailed\s+to\s+fetch\b/i.test(message) ||
    /\bnetwork\s*error\b/i.test(message);

  if (networkish) {
    return (
      <span className="block mt-1 opacity-90 font-normal text-balance">
        The browser could not complete the request to the valuation API (backend down or wrong URL). From the repo root run{" "}
        <code className="text-xs px-1 rounded bg-background/50">pnpm dev</code> so the API is on{" "}
        <code className="text-xs px-1 rounded bg-background/50">:3001</code> and Vite proxies{" "}
        <code className="text-xs px-1 rounded bg-background/50">/api</code>. For <code className="text-xs px-1 rounded bg-background/50">vite preview</code>{" "}
        or production, set <code className="text-xs px-1 rounded bg-background/50">VITE_API_ORIGIN</code> to the API origin (no trailing slash).
      </span>
    );
  }

  return (
    <span className="block mt-1 opacity-90 font-normal text-balance">
      See repo root <code className="text-xs px-1 rounded bg-background/50">.env.example</code> for{" "}
      <code className="text-xs px-1 rounded bg-background/50">DATABASE_URL</code>, <code className="text-xs px-1 rounded bg-background/50">pnpm dev</code>, and{" "}
      <code className="text-xs px-1 rounded bg-background/50">VITE_API_ORIGIN</code>.
    </span>
  );
}
