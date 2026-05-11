import { defineConfig } from "drizzle-kit";
import { config as loadEnv } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
// Repo root `.env`, then optional `lib/db/.env` (override so machine-local overrides win).
loadEnv({ path: path.join(here, "../../.env") });
loadEnv({ path: path.join(here, ".env"), override: true });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env at the repo root (or export DATABASE_URL), " +
      "then start Postgres; for example `docker compose up -d` from the repo root.",
  );
}

export default defineConfig({
  schema: path.join(here, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
