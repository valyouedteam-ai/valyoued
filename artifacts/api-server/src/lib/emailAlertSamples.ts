import { isAuthStubMode } from "./authStub";
import { getClerkPrimaryEmail, publicAppBaseUrl } from "./emailDelivery";

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

export function buildMonitorValueEmailHtml(params: { body: string; estimateUrl: string }): string {
  const safeBody = escapeHtml(params.body);
  const safeUrl = escapeHtml(params.estimateUrl);
  return `<p>${safeBody}</p><p><a href="${safeUrl}">Open valuation</a></p>
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
  const body = "Sample vintage watch is up about 8% since baseline. Confidence 72%.";
  return {
    subject: "Your luxury watch increased in value",
    html: buildMonitorValueEmailHtml({
      body,
      estimateUrl: `${base}/dashboard`,
    }),
  };
}
