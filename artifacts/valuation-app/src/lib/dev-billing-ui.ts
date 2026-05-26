/**
 * Dev billing tier strip (Free / Everyday+ / Pro plus inheritance) and related client-side billing previews.
 *
 * - On by default in Vite development (`import.meta.env.DEV`).
 * - In production builds set `VITE_ENABLE_DEV_BILLING_TOGGLE=1` to show it (for example on a Vercel preview).
 *
 * Do not turn this on for a public production site unless you intend to; with real Clerk it only simulates
 * billing in the browser (the API still enforces real subscriptions unless you also use auth stub).
 */
export function isDevBillingUiEnabled(): boolean {
  const flagged = String(import.meta.env["VITE_ENABLE_DEV_BILLING_TOGGLE"] ?? "").trim() === "1";
  return Boolean(import.meta.env.DEV) || flagged;
}
