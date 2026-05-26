/**
 * Dev billing tier strip (Free / Everyday+ / Pro plus inheritance) and related client-side billing previews.
 *
 * - On by default in Vite development (`import.meta.env.DEV`).
 * - In production builds set `VITE_ENABLE_DEV_BILLING_TOGGLE=1` to show it (for example on a Vercel preview).
 *
 * Do not turn this on for a public production site unless you intend to. With real Clerk, the toolbar only simulates billing in the browser unless your API trusts `X-Stub-Billing-Plan` (normally when `NODE_ENV=development`, or when you set `ALLOW_DEV_STUB_BILLING_HEADERS=1` on a **private** API process). Otherwise use auth stub (`VITE_AUTH_STUB_MODE=1`, `AUTH_STUB_MODE=1`) for end-to-end tier tests.
 */
export function isDevBillingUiEnabled(): boolean {
  const flagged = String(import.meta.env["VITE_ENABLE_DEV_BILLING_TOGGLE"] ?? "").trim() === "1";
  return Boolean(import.meta.env.DEV) || flagged;
}
