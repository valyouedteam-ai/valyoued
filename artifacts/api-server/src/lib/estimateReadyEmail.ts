import { logger } from "./logger";
import { isAuthStubMode } from "./authStub";
import { getUserAlertPrefs } from "./userAlertPrefs";
import { resolveUserEntitlements } from "./entitlements";
import {
  getClerkPrimaryEmail,
  isEmailDeliveryConfigured,
  publicAppBaseUrl,
  sendHtmlEmail,
} from "./emailDelivery";

export async function notifyEstimateReadyEmail(
  userId: string,
  estimate: { id: string; title: string; assetTypeName: string },
): Promise<void> {
  if (isAuthStubMode()) return;
  if (!isEmailDeliveryConfigured()) return;
  const ent = await resolveUserEntitlements(userId);
  if (!ent.hasPaidValuationTier) return;
  const prefs = await getUserAlertPrefs(userId);
  if (!prefs.estimateReadyEmail) return;
  const to = await getClerkPrimaryEmail(userId);
  if (!to) {
    logger.warn({ userId }, "Estimate ready email skipped: no Clerk primary email");
    return;
  }
  const base = publicAppBaseUrl().replace(/\/$/, "");
  const url = `${base}/estimates/${estimate.id}`;
  const safeTitle = escapeHtml(estimate.title);
  const safeType = escapeHtml(estimate.assetTypeName);
  const subject = `Your ValYoued estimate is ready: ${estimate.title}`;
  const html = `<p>Your valuation for <strong>${safeTitle}</strong> (${safeType}) is ready.</p>
<p><a href="${escapeHtml(url)}">Open your report</a></p>
<p style="color:#666;font-size:12px;margin-top:24px">You are receiving this because email alerts are enabled in ValYoued settings. You can turn them off anytime in Settings.</p>`;

  const sent = await sendHtmlEmail({ to, subject, html });
  if (!sent.ok) {
    logger.warn({ userId, error: sent.error }, "Estimate ready email failed");
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
