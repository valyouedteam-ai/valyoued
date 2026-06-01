import { and, eq, gt } from "drizzle-orm";
import { db, estimatesTable, userNotificationsTable } from "@workspace/db";
import { getUserAlertPrefs } from "./userAlertPrefs";
import { resolveUserEntitlements } from "./entitlements";
import { buildMonitorValueEmailHtml, resolveEmailAlertRecipient } from "./emailAlertSamples";
import { publicAppBaseUrl, sendHtmlEmail } from "./emailDelivery";
import { createUserNotification } from "./notificationsService";
import { summaryFieldsFromStored } from "./portfolioAnalytics";
import { logger } from "./logger";

export type MonitorScanOptions = {
  /** Minimum uplift vs baseline (default 0.03 = 3%). Use 0 in dev force mode. */
  minUplift?: number;
  /** Skip 24h dedup (dev force runs only). */
  skipDedup?: boolean;
};

export type MonitorScanResult = {
  monitoredCount: number;
  notifiedCount: number;
  emailedCount: number;
  skippedRecentCount: number;
  skippedThresholdCount: number;
};

const DEDUP_MS = 24 * 60 * 60 * 1000;

/** Lightweight monitor ping: compares adjusted mid drift vs baseline for monitor-intent rows. */
export async function runMonitorValueChangeScan(
  userId: string,
  opts: MonitorScanOptions = {},
): Promise<MonitorScanResult> {
  const minUplift = opts.minUplift ?? 0.03;
  const result: MonitorScanResult = {
    monitoredCount: 0,
    notifiedCount: 0,
    emailedCount: 0,
    skippedRecentCount: 0,
    skippedThresholdCount: 0,
  };

  const ent = await resolveUserEntitlements(userId);
  if (!ent.canUseMonitorEmailAlerts) return result;

  const prefs = await getUserAlertPrefs(userId);
  if (!prefs.monitorValueChangeEmail) return result;

  const rows = await db.select().from(estimatesTable).where(eq(estimatesTable.userId, userId));
  const monitored = rows.filter((r) => r.intent === "monitor");
  result.monitoredCount = monitored.length;
  if (monitored.length === 0) return result;

  const since = new Date(Date.now() - DEDUP_MS);
  const base = publicAppBaseUrl().replace(/\/$/, "");

  for (const row of monitored) {
    const uplift = row.baselineMid > 0 ? (row.adjustedMid - row.baselineMid) / row.baselineMid : 0;
    if (uplift < minUplift) {
      result.skippedThresholdCount += 1;
      continue;
    }

    if (!opts.skipDedup) {
      const [recent] = await db
        .select({ id: userNotificationsTable.id })
        .from(userNotificationsTable)
        .where(
          and(
            eq(userNotificationsTable.userId, userId),
            eq(userNotificationsTable.estimateId, row.id),
            eq(userNotificationsTable.kind, "value_up"),
            gt(userNotificationsTable.createdAt, since),
          ),
        )
        .limit(1);
      if (recent) {
        result.skippedRecentCount += 1;
        continue;
      }
    }

    const summary = summaryFieldsFromStored(row.result, {
      baselineMid: row.baselineMid,
      adjustedMid: row.adjustedMid,
      assetTypeId: row.assetTypeId,
      createdAt: row.createdAt,
    });

    const pct = Math.round(uplift * 100);
    const title = `Your ${row.assetTypeName.toLowerCase()} increased in value`;
    const body = `${row.title} is up about ${pct}% since baseline. Confidence ${summary.confidenceScore ?? "n/a"}%.`;

    await createUserNotification(userId, {
      kind: "value_up",
      title,
      body,
      estimateId: row.id,
      href: `/estimates/${row.id}`,
    });
    result.notifiedCount += 1;

    const recipient = await resolveEmailAlertRecipient(userId);
    if ("to" in recipient) {
      const sent = await sendHtmlEmail({
        to: recipient.to,
        subject: title,
        html: buildMonitorValueEmailHtml({
          body,
          estimateUrl: `${base}/estimates/${row.id}`,
        }),
      });
      if (sent.ok) {
        result.emailedCount += 1;
      } else {
        logger.warn({ userId, error: sent.error }, "monitor value email failed");
      }
    }
  }

  return result;
}

/** Scan portfolio health and enqueue receipt / revalue nudges. */
export async function runPortfolioHealthNotifications(userId: string): Promise<void> {
  const ent = await resolveUserEntitlements(userId);
  if (!ent.canUsePortfolioAnalytics) return;

  const rows = await db.select().from(estimatesTable).where(eq(estimatesTable.userId, userId));
  for (const row of rows) {
    const summary = summaryFieldsFromStored(row.result, {
      baselineMid: row.baselineMid,
      adjustedMid: row.adjustedMid,
      assetTypeId: row.assetTypeId,
      createdAt: row.createdAt,
    });

    if (summary.valuationFreshness === "stale") {
      await createUserNotification(userId, {
        kind: "revalue",
        title: `Time to revalue ${row.title}`,
        body: "Market context may have moved since this run was saved.",
        estimateId: row.id,
        href: `/estimates/${row.id}`,
      });
    } else if (summary.receiptStatus === "missing" && row.adjustedMid >= 1500) {
      await createUserNotification(userId, {
        kind: "receipt",
        title: `Add receipt for ${row.title}`,
        body: "Documented provenance helps insurance and resale confidence.",
        estimateId: row.id,
        href: `/estimates/${row.id}`,
      });
    }
  }
}
