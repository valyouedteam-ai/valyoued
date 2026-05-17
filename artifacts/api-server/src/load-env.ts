/**
 * Must run before any import that pulls in `@workspace/db` (DATABASE_URL).
 * When bundled, `import.meta.url` is `dist/index.mjs`, so we walk up to the workspace root.
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(here, "..", "..", "..");

dotenv.config({ path: path.join(workspaceRoot, ".env") });
dotenv.config({ path: path.join(workspaceRoot, ".env.local"), override: true });

/** Express Clerk reads `CLERK_PUBLISHABLE_KEY`; many setups only set the Vite-prefixed key. */
function ensureClerkPublishableKeyFromFrontendEnv(): void {
  if (process.env.CLERK_PUBLISHABLE_KEY?.trim()) return;
  const fromVite = process.env.VITE_CLERK_PUBLISHABLE_KEY?.trim();
  const fromNext = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  const pk = fromVite || fromNext;
  if (pk) process.env.CLERK_PUBLISHABLE_KEY = pk;
}
ensureClerkPublishableKeyFromFrontendEnv();

function authStubEnabled(): boolean {
  const v = process.env.AUTH_STUB_MODE;
  return v === "1" || v?.toLowerCase() === "true";
}

/**
 * Clerk middleware needs both keys on **this process** (API server). Frontends on Vercel only
 * receive their own env — they are not passed to Railway/Docker automatically.
 */
function assertClerkEnvUnlessStub(): void {
  if (authStubEnabled()) return;
  const pk = process.env.CLERK_PUBLISHABLE_KEY?.trim();
  const sk = process.env.CLERK_SECRET_KEY?.trim();
  if (pk && sk) return;
  const missing: string[] = [];
  if (!pk) {
    missing.push(
      "CLERK_PUBLISHABLE_KEY (or VITE_CLERK_PUBLISHABLE_KEY / NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY on the API host)",
    );
  }
  if (!sk) missing.push("CLERK_SECRET_KEY");
  throw new Error(
    `Clerk credentials missing for the valuation API: ${missing.join("; ")}. ` +
      "Add them to this service’s environment (Railway Variables, Fly secrets, Docker -e, etc.). " +
      "Values from the Vercel project are not available here — use the same keys from https://dashboard.clerk.com → API Keys.",
  );
}
assertClerkEnvUnlessStub();

if (!process.env.PORT?.trim()) {
  process.env.PORT = "3001";
}
