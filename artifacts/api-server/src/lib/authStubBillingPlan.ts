import { AsyncLocalStorage } from "node:async_hooks";
import type { Request, Response, NextFunction } from "express";
import { isAuthStubMode } from "./authStub";
import { logger } from "./logger";

/** Mirrors `PlanSlug`; lives here to avoid coupling this module to Drizzle-heavy entitlements imports. */
export type AuthStubResolvedPlanSlug = "none" | "everyday_plus" | "professional";

type StubRequestBillingState = {
  planSlug: AuthStubResolvedPlanSlug;
  inheritanceAddon: boolean;
};

const billingStateStore = new AsyncLocalStorage<StubRequestBillingState>();

let warnedAllowStubBillingOutsideDev = false;

/**
 * Headers `X-Stub-Billing-Plan` / `X-Stub-Inheritance-Addon` overlay DB billing for Clerk when:
 * - `DISABLE_DEV_STUB_BILLING_HEADERS` is not `1`,
 * - and (`NODE_ENV=development`, typical `pnpm dev` in api-server, or explicit `ALLOW_DEV_STUB_BILLING_HEADERS=1`).
 * Do not set `ALLOW_DEV_STUB_BILLING_HEADERS` on public production APIs (simulated Professional would bypass Stripe).
 */
function shouldTrustDevelopmentStubBillingHeaders(): boolean {
  if (process.env.DISABLE_DEV_STUB_BILLING_HEADERS === "1") return false;
  if (process.env.ALLOW_DEV_STUB_BILLING_HEADERS === "1") {
    if (process.env.NODE_ENV !== "development" && !warnedAllowStubBillingOutsideDev) {
      warnedAllowStubBillingOutsideDev = true;
      logger.warn(
        "ALLOW_DEV_STUB_BILLING_HEADERS=1 is set: honoring X-Stub-Billing-Plan outside NODE_ENV development. " +
          "Keep this limited to trusted local tooling, not internet-facing deployments.",
      );
    }
    return true;
  }
  return process.env.NODE_ENV === "development";
}

/**
 * Dev billing overlay for real Clerk (`NODE_ENV=development` unless `ALLOW_DEV_STUB_BILLING_HEADERS=1`). Prefers `req.devStubBillingOverlay`
 * set synchronously in middleware; falls back to ALS for edge cases. Auth stub mode always uses entitlements
 * from `currentAuthStubBillingPlanSlug()`, not this helper.
 */
export function currentDevelopmentBillingPlanOverlay(req?: Request): {
  planSlug: AuthStubResolvedPlanSlug;
  inheritanceAddon: boolean;
} | null {
  if (!shouldTrustDevelopmentStubBillingHeaders()) return null;
  if (isAuthStubMode()) return null;
  const fromReq = req?.devStubBillingOverlay;
  if (fromReq != null) return fromReq;
  return billingStateStore.getStore() ?? null;
}

export function stubBillingPlanAlsMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (isAuthStubMode()) {
    const planSlug = resolveAuthStubBillingPlanSlugFromRequest(req);
    const inheritanceAddon = resolveAuthStubInheritanceAddonFromRequest(req);
    billingStateStore.run({ planSlug, inheritanceAddon }, () => next());
    return;
  }

  if (!shouldTrustDevelopmentStubBillingHeaders()) {
    next();
    return;
  }

  /** Real Clerk sessions: overlay only when the dev client deliberately sends billing simulation headers. */
  const rawPlan = normalizeHeaderOrEnvToken(req.get("x-stub-billing-plan"));
  if (rawPlan === "") {
    next();
    return;
  }
  const mappedPlan = mapTokenToSlug(rawPlan);
  if (mappedPlan === null) {
    next();
    return;
  }
  /** Do not inherit env defaults for Clerk dev overlays (would surprise local simulations). */
  const inheritanceAddon = mapAuthStubInheritanceHeader(req) ?? false;

  /** Attach on `req` so async Express handlers keep the snapshot after awaits (ALS from `run` + next() often does not). */
  req.devStubBillingOverlay = { planSlug: mappedPlan, inheritanceAddon };
  next();
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
