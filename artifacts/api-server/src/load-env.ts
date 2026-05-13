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

if (!process.env.PORT?.trim()) {
  process.env.PORT = "3001";
}
