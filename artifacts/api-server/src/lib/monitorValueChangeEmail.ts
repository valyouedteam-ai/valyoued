import { eq } from "drizzle-orm";
import { db, estimatesTable } from "@workspace/db";
import { getUserAlertPrefs } from "./userAlertPrefs";
import { resolveUserEntitlements } from "./entitlements";
import { getClerkPrimaryEmail, sendHtmlEmail } from "./emailDelivery";
import { createUserNotification } from "./notificationsService";
import { summaryFieldsFromStored } from "./portfolioAnalytics";
import { logger } from "./logger";

/** Lightweight monitor ping: compares adjusted mid drift vs baseline for monitor-intent rows. */
export async function runMonitorValueChangeScan(userId: string): Promise<void> {
  const ent = await resolveUserEntitlements(userId);
  if (!ent.canUseMonitorEmailAlerts) return;

  const prefs = await getUserAlertPrefs(userId);
  if (!prefs.monitorValueChangeEmail) return;

  const rows = await db.select().from(estimatesTable).where(eq(estimatesTable.userId, userId));
  const monitored = rows.filter((r) => r.intent === "monitor");
  if (monitored.length === 0) return;

  for (const row of monitored) {
    const uplift = row.baselineMid > 0 ? (row.adjustedMid - row.baselineMid) / row.baselineMid : 0;
    if (uplift < 0.03) continue;

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

    const email = await getClerkPrimaryEmail(userId);
    if (email) {
      await sendHtmlEmail({
        to: email,
        subject: title,
        html: `<p>${body}</p><p><a href="${process.env.PUBLIC_APP_URL ?? ""}/estimates/${row.id}">Open valuation</a></p>`,
      }).catch((err) => logger.error({ err, userId }, "monitor value email failed"));
    }
  }
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
