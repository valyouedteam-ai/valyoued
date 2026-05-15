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

if (!process.env.PORT?.trim()) {
  process.env.PORT = "3001";
}
