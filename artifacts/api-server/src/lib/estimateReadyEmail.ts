import { logger } from "./logger";
import { getUserAlertPrefs } from "./userAlertPrefs";
import { resolveUserEntitlements } from "./entitlements";
import {
  buildEstimateReadyEmailHtml,
  resolveEmailAlertRecipient,
} from "./emailAlertSamples";
import {
  isEmailDeliveryConfigured,
  publicAppBaseUrl,
  sendHtmlEmail,
} from "./emailDelivery";

export async function notifyEstimateReadyEmail(
  userId: string,
  estimate: { id: string; title: string; assetTypeName: string },
): Promise<void> {
  if (!isEmailDeliveryConfigured()) return;
  const ent = await resolveUserEntitlements(userId);
  if (!ent.hasPaidValuationTier) return;
  const prefs = await getUserAlertPrefs(userId);
  if (!prefs.estimateReadyEmail) return;
  const recipient = await resolveEmailAlertRecipient(userId);
  if ("error" in recipient) {
    logger.warn({ userId, error: recipient.error }, "Estimate ready email skipped: no recipient");
    return;
  }
  const to = recipient.to;
  const base = publicAppBaseUrl().replace(/\/$/, "");
  const url = `${base}/estimates/${estimate.id}`;
  const subject = `Your ValYoued estimate is ready: ${estimate.title}`;
  const html = buildEstimateReadyEmailHtml({
    title: estimate.title,
    assetTypeName: estimate.assetTypeName,
    estimateUrl: url,
  });

  const sent = await sendHtmlEmail({ to, subject, html });
  if (!sent.ok) {
    logger.warn({ userId, error: sent.error }, "Estimate ready email failed");
  }
}
