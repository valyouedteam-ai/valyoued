import { AsyncLocalStorage } from "node:async_hooks";
import type { Request, Response, NextFunction } from "express";
import { isAuthStubMode } from "./authStub";

/** Mirrors `PlanSlug`; lives here to avoid coupling this module to Drizzle-heavy entitlements imports. */
export type AuthStubResolvedPlanSlug = "none" | "everyday_plus" | "professional";

type StubRequestBillingState = {
  planSlug: AuthStubResolvedPlanSlug;
  inheritanceAddon: boolean;
};

const billingStateStore = new AsyncLocalStorage<StubRequestBillingState>();

export function stubBillingPlanAlsMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (!isAuthStubMode()) {
    next();
    return;
  }
  const planSlug = resolveAuthStubBillingPlanSlugFromRequest(req);
  const inheritanceAddon = resolveAuthStubInheritanceAddonFromRequest(req);
  billingStateStore.run({ planSlug, inheritanceAddon }, () => next());
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

function mapAuthStubInheritanceHeader(req: Request): boolean | null {
  const raw = req.get("x-stub-inheritance-addon");
  if (raw == null || raw.trim() === "") return null;
  const h = normalizeHeaderOrEnvToken(raw);
  if (h === "1" || h === "true" || h === "on" || h === "yes") return true;
  if (h === "0" || h === "false" || h === "off" || h === "no") return false;
  return null;
}

/** Env fallback when the dev client does not send `X-Stub-Inheritance-Addon`. */
export function parseEnvAuthStubInheritanceAddon(): boolean {
  return process.env.AUTH_STUB_INHERITANCE_ADDON?.trim() === "1";
}

function resolveAuthStubBillingPlanSlugFromRequest(req: Request): AuthStubResolvedPlanSlug {
  const fromHeader = mapTokenToSlug(normalizeHeaderOrEnvToken(req.get("x-stub-billing-plan")));
  return fromHeader ?? parseEnvAuthStubBillingTier();
}

function resolveAuthStubInheritanceAddonFromRequest(req: Request): boolean {
  const fromHeader = mapAuthStubInheritanceHeader(req);
  if (fromHeader !== null) return fromHeader;
  return parseEnvAuthStubInheritanceAddon();
}

/** Inside an API request, prefers the ALS value from middleware; falls back to env when ALS is absent. */
export function currentAuthStubBillingPlanSlug(): AuthStubResolvedPlanSlug {
  const s = billingStateStore.getStore();
  if (s) return s.planSlug;
  return parseEnvAuthStubBillingTier();
}

export function currentAuthStubInheritanceAddon(): boolean {
  const s = billingStateStore.getStore();
  if (s) return s.inheritanceAddon;
  return parseEnvAuthStubInheritanceAddon();
}
