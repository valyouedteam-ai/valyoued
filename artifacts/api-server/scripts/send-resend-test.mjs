/**
 * Sends one transactional email via Resend using the same env vars as the API.
 * Usage (from repo root): node artifacts/api-server/scripts/send-resend-test.mjs <to@email.com>
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = path.resolve(apiRoot, "..", "..");

dotenv.config({ path: path.join(workspaceRoot, ".env") });
dotenv.config({ path: path.join(workspaceRoot, ".env.local"), override: true });

const apiKey = process.env.RESEND_API_KEY?.trim();
const from = process.env.EMAIL_FROM?.trim();
const to = (process.argv[2] || "").trim();

if (!apiKey || !from) {
  console.error("Missing RESEND_API_KEY or EMAIL_FROM. Add both to the workspace root .env (same as the API).");
  process.exit(1);
}
if (!to) {
  console.error("Usage: node artifacts/api-server/scripts/send-resend-test.mjs <recipient@email.com>");
  process.exit(1);
}

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    authorization: `Bearer ${apiKey}`,
    "content-type": "application/json",
  },
  body: JSON.stringify({
    from,
    to: [to],
    subject: "ValYoued Resend test",
    html: "<p>If you received this, Resend is wired correctly.</p>",
  }),
});

const raw = await res.text();
console.log(`HTTP ${res.status}`);
console.log(raw.length > 600 ? `${raw.slice(0, 599)}…` : raw);
process.exit(res.ok ? 0 : 1);
