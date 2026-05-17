import { logger } from "./logger";
import { isAuthStubMode } from "./authStub";

export function publicAppBaseUrl(): string {
  return process.env.PUBLIC_APP_URL ?? process.env.VITE_APP_ORIGIN ?? "http://localhost:5173";
}

export function isEmailDeliveryConfigured(): boolean {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  return Boolean(key && from);
}

export async function getClerkPrimaryEmail(userId: string): Promise<string | null> {
  if (isAuthStubMode()) return null;
  const secret = process.env.CLERK_SECRET_KEY?.trim();
  if (!secret) return null;
  try {
    const res = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(userId)}`, {
      headers: { authorization: `Bearer ${secret}` },
    });
    if (!res.ok) {
      logger.warn({ userId, status: res.status }, "Clerk user lookup failed for email");
      return null;
    }
    const data = (await res.json()) as {
      primary_email_address_id?: string | null;
      email_addresses?: Array<{ id: string; email_address: string }>;
    };
    const emails = data.email_addresses ?? [];
    const primaryId = data.primary_email_address_id;
    const primary = primaryId ? emails.find((e) => e.id === primaryId) : undefined;
    return primary?.email_address ?? emails[0]?.email_address ?? null;
  } catch (err) {
    logger.error({ err, userId }, "Clerk user lookup threw");
    return null;
  }
}

export async function sendHtmlEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) {
    return { ok: false, error: "Email delivery is not configured on the server." };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });
    const raw = await res.text();
    if (!res.ok) {
      const hint = raw.length > 280 ? `${raw.slice(0, 279)}…` : raw;
      return {
        ok: false,
        error: hint || `Resend returned ${res.status}`,
      };
    }
    return { ok: true };
  } catch (err) {
    logger.error({ err }, "sendHtmlEmail failed");
    return { ok: false, error: err instanceof Error ? err.message : "Email send failed" };
  }
}
