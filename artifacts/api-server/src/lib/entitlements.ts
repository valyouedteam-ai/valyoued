import { eq, sql, and, gte, lt } from "drizzle-orm";
import {
  db,
  billingSubscriptionsTable,
  estimatesTable,
  estimateUsageMonthlyTable,
} from "@workspace/db";

const FREE_MONTHLY_VALUATION_CAP = 5;

const ACTIVE_SUB_STATUSES = new Set(["active", "trialing", "past_due"]);

/** UTC calendar month bucket for usage accounting. */
export function currentYearMonthUtc(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return `${y}-${m < 10 ? `0${m}` : m}`;
}

export type PlanSlug = "none" | "everyday_plus" | "professional";

export interface UserEntitlements {
  tier: "free" | "pro";
  planSlug: PlanSlug;
  subscriptionStatus: string;
  /** Stripe add-on entitlement */
  hasInheritanceAddon: boolean;
  /** Valuations created this UTC month */
  valuationsThisMonth: number;
  /** 5 when on free Everyday; unlimited when subscribed */
  valuationsMonthLimit: number | null;
  valuationsRemainingFree: number | null;
  hasPaidValuationTier: boolean;
  listingQuality: "basic" | "premium";
  canUseInternationalArbitrage: boolean;
  /** Pro insights block + richer selling narration */
  canUseAdvancedSellingReco: boolean;
  /** Paid + user prefs — callers still check prefs table */
  canUseMonitorEmailAlerts: boolean;
}

export function classifyStripePriceId(priceId: string): "everyday_plus" | "professional" | "inheritance" | null {
  const everyday = process.env.STRIPE_PRICE_EVERYDAY_PLUS?.trim();
  const professional = process.env.STRIPE_PRICE_PROFESSIONAL?.trim();
  const legacyPro = process.env.STRIPE_PRICE_PRO?.trim();
  const inheritance = process.env.STRIPE_PRICE_INHERITANCE_ADDON?.trim();

  if (inheritance && priceId === inheritance) return "inheritance";
  if (professional && priceId === professional) return "professional";
  if (everyday && priceId === everyday) return "everyday_plus";
  if (legacyPro && priceId === legacyPro) {
    if (professional && legacyPro === professional) return "professional";
    return "everyday_plus";
  }
  return null;
}

export function stripePriceIdMap(): Record<string, "everyday_plus" | "professional" | "inheritance"> {
  const everyday =
    process.env.STRIPE_PRICE_EVERYDAY_PLUS?.trim() || process.env.STRIPE_PRICE_PRO?.trim();
  const professional =
    process.env.STRIPE_PRICE_PROFESSIONAL?.trim() || process.env.STRIPE_PRICE_PRO?.trim();
  const inheritance = process.env.STRIPE_PRICE_INHERITANCE_ADDON?.trim();
  const map: Record<string, "everyday_plus" | "professional" | "inheritance"> = {};
  if (everyday) map[everyday] = "everyday_plus";
  if (professional && professional !== everyday) map[professional] = "professional";
  if (!professional && everyday) map[everyday] = "everyday_plus";
  if (inheritance) map[inheritance] = "inheritance";
  return map;
}

async function billingRow(userId: string) {
  const [row] = await db.select().from(billingSubscriptionsTable).where(eq(billingSubscriptionsTable.userId, userId));
  return row ?? null;
}

async function rollupCount(userId: string, ym: string): Promise<number> {
  const [row] = await db
    .select({ count: estimateUsageMonthlyTable.count })
    .from(estimateUsageMonthlyTable)
    .where(and(eq(estimateUsageMonthlyTable.userId, userId), eq(estimateUsageMonthlyTable.yearMonth, ym)));
  return row?.count ?? 0;
}

async function countEstimatesInMonthUtc(userId: string, ym: string): Promise<number> {
  const [y, mo] = ym.split("-").map(Number);
  const start = new Date(Date.UTC(y, mo - 1, 1, 0, 0, 0, 0));
  const next = new Date(Date.UTC(y, mo, 1, 0, 0, 0, 0));
  const [row] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(estimatesTable)
    .where(and(eq(estimatesTable.userId, userId), gte(estimatesTable.createdAt, start), lt(estimatesTable.createdAt, next)));
  return row?.c ?? 0;
}

export async function getValuationsUsedThisMonth(userId: string, ym: string = currentYearMonthUtc()): Promise<number> {
  const fromRollup = await rollupCount(userId, ym);
  const fromLive = await countEstimatesInMonthUtc(userId, ym);
  return Math.max(fromRollup, fromLive);
}

export async function incrementMonthlyEstimateUsage(userId: string): Promise<void> {
  const ym = currentYearMonthUtc();
  await db
    .insert(estimateUsageMonthlyTable)
    .values({ userId, yearMonth: ym, count: 1 })
    .onConflictDoUpdate({
      target: [estimateUsageMonthlyTable.userId, estimateUsageMonthlyTable.yearMonth],
      set: { count: sql`${estimateUsageMonthlyTable.count} + 1`, updatedAt: new Date() },
    });
}

export async function resolveUserEntitlements(userId: string): Promise<UserEntitlements> {
  const row = await billingRow(userId);
  const status = row?.status ?? "inactive";
  const activePaid =
    ACTIVE_SUB_STATUSES.has(status) && row != null && (row.tier === "pro" || row.planSlug != null);

  let planSlug: PlanSlug = "none";
  if (activePaid && row?.planSlug === "professional") planSlug = "professional";
  else if (activePaid && row?.planSlug === "everyday_plus") planSlug = "everyday_plus";
  else if (activePaid && row?.tier === "pro" && row?.planSlug == null)
    planSlug = "everyday_plus";

  const hasPaidValuationTier = activePaid;
  const valuationsThisMonth = await getValuationsUsedThisMonth(userId);
  const valuationsMonthLimit = hasPaidValuationTier ? null : FREE_MONTHLY_VALUATION_CAP;
  const valuationsRemainingFree =
    valuationsMonthLimit == null ? null : Math.max(0, valuationsMonthLimit - valuationsThisMonth);

  return {
    tier: hasPaidValuationTier ? "pro" : "free",
    planSlug,
    subscriptionStatus: status,
    hasInheritanceAddon: row?.hasInheritanceAddon ?? false,
    valuationsThisMonth,
    valuationsMonthLimit,
    valuationsRemainingFree,
    hasPaidValuationTier,
    listingQuality: hasPaidValuationTier ? "premium" : "basic",
    canUseInternationalArbitrage: hasPaidValuationTier,
    canUseAdvancedSellingReco: hasPaidValuationTier,
    canUseMonitorEmailAlerts: hasPaidValuationTier,
  };
}

export function valuationTierForEstimate(ent: Pick<UserEntitlements, "hasPaidValuationTier">): "free" | "pro" {
  return ent.hasPaidValuationTier ? "pro" : "free";
}

export { FREE_MONTHLY_VALUATION_CAP };
