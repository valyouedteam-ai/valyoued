import { AsyncLocalStorage } from "node:async_hooks";
import type { Request, Response, NextFunction } from "express";
import { isAuthStubMode } from "./authStub";

/** Mirrors `PlanSlug`; lives here to avoid coupling this module to Drizzle-heavy entitlements imports. */
export type AuthStubResolvedPlanSlug = "none" | "everyday_plus" | "professional";

const slugStore = new AsyncLocalStorage<AuthStubResolvedPlanSlug>();

export function stubBillingPlanAlsMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (!isAuthStubMode()) {
    next();
    return;
  }
  slugStore.run(parseAuthStubBillingPlanFromRequest(req), () => next());
}

function normalizeHeaderOrEnvToken(raw: string | undefined): string {
  return (raw ?? "").trim().toLowerCase();
}

function mapTokenToSlug(token: string): AuthStubResolvedPlanSlug | null {
  switch (token) {
    case "":
      return null;
    case "free":
    case "everyday_free":
    case "none":
      return "none";
    case "everyday_plus":
    case "plus":
    case "paid":
      return "everyday_plus";
    case "pro":
      /** Legacy stub env: Stripe-era `pro` slot maps to Everyday+ unless professional is spelled out. */
      return "everyday_plus";
    case "professional":
    case "seller":
      return "professional";
    default:
      return null;
  }
}

function parseEnvAuthStubBillingTier(): AuthStubResolvedPlanSlug {
  const slug = mapTokenToSlug(normalizeHeaderOrEnvToken(process.env.AUTH_STUB_BILLING_TIER));
  return slug ?? "none";
}

function parseAuthStubBillingPlanFromRequest(req: Request): AuthStubResolvedPlanSlug {
  const fromHeader = mapTokenToSlug(normalizeHeaderOrEnvToken(req.get("x-stub-billing-plan")));
  return fromHeader ?? parseEnvAuthStubBillingTier();
}

/** Inside an API request, prefers the ALS value from middleware; falls back to env when ALS is absent. */
export function currentAuthStubBillingPlanSlug(): AuthStubResolvedPlanSlug {
  const fromStore = slugStore.getStore();
  return fromStore ?? parseEnvAuthStubBillingTier();
}
