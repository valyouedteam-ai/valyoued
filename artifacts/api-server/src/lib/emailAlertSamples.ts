import { isAuthStubMode } from "./authStub";
import { getClerkPrimaryEmail, publicAppBaseUrl } from "./emailDelivery";
import { buildMonitorValueAlertContent, type ConfidenceBreakdownLine } from "./confidenceExplanation.js";

export type EmailAlertSampleKind = "connectivity" | "estimate_ready" | "monitor_value";

export function emailAlertDevToolsEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const FOOTER =
  '<p style="color:#666;font-size:12px;margin-top:24px">You are receiving this because email alerts are enabled in ValYoued settings. You can turn them off anytime in Settings.</p>';

const BILLING_FOOTER =
  '<p style="color:#666;font-size:12px;margin-top:24px">You are receiving this because you have a ValYoued subscription or add-on. To update payment details or cancel before the next charge, open Settings and use Manage subscription.</p>';

export function buildBillingRenewalReminderEmailHtml(params: {
  planLabels: string[];
  amountFormatted: string;
  chargeDateFormatted: string;
  settingsUrl: string;
}): string {
  const plans = escapeHtml(params.planLabels.join(", "));
  const safeAmount = escapeHtml(params.amountFormatted);
  const safeDate = escapeHtml(params.chargeDateFormatted);
  const safeSettings = escapeHtml(params.settingsUrl);
  return `<p style="font-size:16px;line-height:1.5">This is advance notice before your next ValYoued charge.</p>
<p style="line-height:1.5"><strong>Plan:</strong> ${plans}<br/>
<strong>Amount:</strong> ${safeAmount}<br/>
<strong>Charge date:</strong> ${safeDate}</p>
<p style="line-height:1.5">We send this reminder about three days before each renewal so you can review or cancel in time.</p>
<p><a href="${safeSettings}">Manage subscription in Settings</a></p>
${BILLING_FOOTER}`;
}

export function buildBillingSubscriptionConfirmedEmailHtml(params: {
  planLabels: string[];
  amountFormatted: string;
  renewalDateFormatted: string;
  isTrial: boolean;
  settingsUrl: string;
}): string {
  const plans = escapeHtml(params.planLabels.join(", "));
  const safeAmount = escapeHtml(params.amountFormatted);
  const safeDate = escapeHtml(params.renewalDateFormatted);
  const safeSettings = escapeHtml(params.settingsUrl);
  const renewalLabel = params.isTrial ? "First charge date" : "Next renewal date";
  const intro = params.isTrial
    ? "Your ValYoued trial is active. When the trial ends, billing continues unless you cancel beforehand."
    : "Thanks for subscribing. Your plan is active and will renew monthly unless you cancel.";
  return `<p style="font-size:16px;line-height:1.5">${intro}</p>
<p style="line-height:1.5"><strong>Plan:</strong> ${plans}<br/>
<strong>Price:</strong> ${safeAmount} per billing period<br/>
<strong>${renewalLabel}:</strong> ${safeDate}</p>
<p style="line-height:1.5">Before each renewal, we email you about three days ahead of the charge so you can review or cancel in Settings.</p>
<p><a href="${safeSettings}">Open Billing in Settings</a></p>
${BILLING_FOOTER}`;
}

export function buildConnectivityTestEmailHtml(appUrl: string): string {
  const base = appUrl.replace(/\/$/, "");
  return `<p>This is a test message from ValYoued.</p><p>If you received it, email delivery is working. Open the app: <a href="${escapeHtml(base)}">${escapeHtml(base)}</a></p>`;
}

export function buildEstimateReadyEmailHtml(params: {
  title: string;
  assetTypeName: string;
  estimateUrl: string;
}): string {
  const safeTitle = escapeHtml(params.title);
  const safeType = escapeHtml(params.assetTypeName);
  const safeUrl = escapeHtml(params.estimateUrl);
  return `<p>Your valuation for <strong>${safeTitle}</strong> (${safeType}) is ready.</p>
<p><a href="${safeUrl}">Open your report</a></p>
${FOOTER}`;
}

export function buildMonitorValueEmailHtml(params: {
  summaryLine: string;
  bodyPlain: string;
  breakdownLines: ConfidenceBreakdownLine[];
  citationUrls: string[];
  confidenceScore: number | null;
  estimateUrl: string;
}): string {
  const safeSummary = escapeHtml(params.summaryLine);
  const safeUrl = escapeHtml(params.estimateUrl);

  const breakdownHtml =
    params.breakdownLines.length > 0
      ? `<p style="margin:16px 0 8px;font-weight:600">Confidence breakdown${
          params.confidenceScore != null ? ` (${params.confidenceScore}/100)` : ""
        }</p>
<ul style="margin:0 0 16px;padding-left:20px;line-height:1.5">
${params.breakdownLines
  .map(
    (line) =>
      `<li><strong>${escapeHtml(line.label)}</strong> (${line.weightPct}% weight): ${line.score}/100. ${escapeHtml(line.detail)}</li>`,
  )
  .join("\n")}
</ul>`
      : "";

  const sourcesHtml =
    params.citationUrls.length > 0
      ? `<p style="margin:16px 0 8px;font-weight:600">Sources cited on this valuation</p>
<ul style="margin:0 0 16px;padding-left:20px;line-height:1.5">
${params.citationUrls
  .map((url) => `<li><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></li>`)
  .join("\n")}
</ul>`
      : `<p style="margin:16px 0;color:#666;font-size:14px">No web research citations on this snapshot. Newer valuations may include source links.</p>`;

  const detailParagraphs = params.bodyPlain
    .split(/\n\n+/)
    .slice(1)
    .map((p) => `<p style="margin:0 0 12px;line-height:1.5">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");

  return `<p style="font-size:16px;line-height:1.5">${safeSummary}</p>
${detailParagraphs}
${breakdownHtml}
${sourcesHtml}
<p><a href="${safeUrl}">Open full valuation report</a></p>
${FOOTER}`;
}

export async function resolveEmailAlertRecipient(
  userId: string,
  overrideTo?: string | null,
): Promise<{ to: string } | { error: string }> {
  const trimmed = overrideTo?.trim();
  if (trimmed) {
    if (process.env.NODE_ENV === "production") {
      return { error: "Custom recipient is only allowed in non-production environments." };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return { error: "Invalid email address." };
    }
    return { to: trimmed };
  }
  if (isAuthStubMode()) {
    const stub = process.env.STUB_TEST_EMAIL?.trim();
    if (stub) return { to: stub };
    return {
      error:
        'Auth stub mode has no Clerk email. Set STUB_TEST_EMAIL in .env or pass { "to": "you@example.com" } in the request body.',
    };
  }
  const to = await getClerkPrimaryEmail(userId);
  if (!to) return { error: "No primary email found for your account." };
  return { to };
}

export function sampleEstimateReadyEmail() {
  const base = publicAppBaseUrl().replace(/\/$/, "");
  return {
    subject: "Your ValYoued estimate is ready: Sample vintage watch",
    html: buildEstimateReadyEmailHtml({
      title: "Sample vintage watch",
      assetTypeName: "Luxury watch",
      estimateUrl: `${base}/dashboard`,
    }),
  };
}

export function sampleMonitorValueEmail() {
  const base = publicAppBaseUrl().replace(/\/$/, "");
  const alert = buildMonitorValueAlertContent({
    title: "Sample vintage watch",
    assetTypeName: "Luxury watch",
    currency: "GBP",
    baselineMid: 4200,
    adjustedMid: 4536,
    analytics: {
      confidenceScore: 72,
      fieldCompleteness: {
        pct: 85,
        completed: ["Title", "Brand", "Model", "Condition"],
        missing: ["Purchase Price", "Year"],
      },
      resalePotential: "moderate",
      actionRecommendation: "hold",
      valuationFreshness: "fresh",
      receiptStatus: "partial",
      confidenceBreakdown: {
        fieldCompleteness: 85,
        compQuality: 68,
        marketStability: 62,
      },
    },
    citationUrls: [`${base}/estimates/sample`],
    comparableCount: 4,
  });
  return {
    subject: "Your luxury watch increased in value",
    html: buildMonitorValueEmailHtml({
      summaryLine: alert.summaryLine,
      bodyPlain: alert.bodyPlain,
      breakdownLines: alert.breakdownLines,
      citationUrls: alert.citationUrls,
      confidenceScore: alert.confidenceScore,
      estimateUrl: `${base}/dashboard`,
    }),
  };
}
