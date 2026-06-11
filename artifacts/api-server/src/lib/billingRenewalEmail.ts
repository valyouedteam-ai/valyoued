import Stripe from "stripe";
import { and, eq, sql } from "drizzle-orm";
import { db, platformEventsTable } from "@workspace/db";
import {
  buildBillingRenewalReminderEmailHtml,
  buildBillingSubscriptionConfirmedEmailHtml,
  resolveEmailAlertRecipient,
} from "./emailAlertSamples";
import {
  classifyInheritanceAddonPrice,
  classifyStripePriceId,
} from "./entitlements";
import { isEmailDeliveryConfigured, publicAppBaseUrl, sendHtmlEmail } from "./emailDelivery";
import { logger } from "./logger";

const RENEWAL_NOTICE_EVENT = "billing.renewal_notice_sent";
const SUBSCRIPTION_CONFIRMED_EVENT = "billing.subscription_confirmed";

export function formatStripeMoney(amountCents: number, currency: string): string {
  const cur = currency.toUpperCase();
  const amount = amountCents / 100;
  if (cur === "GBP") return `£${amount.toFixed(2)}`;
  if (cur === "USD") return `$${amount.toFixed(2)}`;
  if (cur === "EUR") return `€${amount.toFixed(2)}`;
  return `${amount.toFixed(2)} ${cur}`;
}

export function formatBillingDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function describePriceId(priceId: string | undefined): string {
  if (!priceId) return "Subscription";
  if (classifyInheritanceAddonPrice(priceId)) return "Inheritance add-on";
  const plan = classifyStripePriceId(priceId);
  if (plan === "professional") return "Professional";
  if (plan === "everyday_plus") return "Everyday";
  return "Subscription";
}

function linePriceId(line: Stripe.InvoiceLineItem): string | undefined {
  const price = line.price;
  if (typeof price === "string") return price;
  return price?.id;
}

export function summarizeInvoiceLines(invoice: Stripe.Invoice): string[] {
  const lines = invoice.lines?.data ?? [];
  const labels = new Set<string>();
  for (const line of lines) {
    labels.add(describePriceId(linePriceId(line)));
  }
  if (labels.size === 0) return ["ValYoued subscription"];
  return [...labels];
}

function subscriptionChargeSummary(sub: Stripe.Subscription): {
  planLabels: string[];
  amountCents: number;
  currency: string;
} {
  const labels = new Set<string>();
  let amountCents = 0;
  let currency = "gbp";

  for (const item of sub.items?.data ?? []) {
    const price = item.price;
    if (typeof price !== "object" || price == null) continue;
    labels.add(describePriceId(price.id));
    const unit = price.unit_amount ?? 0;
    const qty = item.quantity ?? 1;
    amountCents += unit * qty;
    if (price.currency) currency = price.currency;
  }

  return {
    planLabels: labels.size > 0 ? [...labels] : ["ValYoued subscription"],
    amountCents,
    currency,
  };
}

async function billingEmailAlreadySent(eventType: string, payloadKey: "invoiceId" | "subscriptionId", idValue: string): Promise<boolean> {
  const jsonPath =
    payloadKey === "invoiceId"
      ? sql`${platformEventsTable.payload}->>'invoiceId' = ${idValue}`
      : sql`${platformEventsTable.payload}->>'subscriptionId' = ${idValue}`;
  const [row] = await db
    .select({ id: platformEventsTable.id })
    .from(platformEventsTable)
    .where(and(eq(platformEventsTable.eventType, eventType), jsonPath))
    .limit(1);
  return Boolean(row);
}

async function recordBillingEmailSent(params: {
  userId: string;
  eventType: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(platformEventsTable).values({
      userId: params.userId,
      eventType: params.eventType,
      payload: params.payload,
    });
  } catch (err) {
    logger.warn({ err, eventType: params.eventType }, "recordBillingEmailSent failed (non-fatal)");
  }
}

/** Advance renewal notice (typically 3 days before charge via Stripe `invoice.upcoming`). */
export async function notifyBillingRenewalUpcoming(userId: string, invoice: Stripe.Invoice): Promise<void> {
  if (!isEmailDeliveryConfigured()) {
    logger.warn({ userId, invoiceId: invoice.id }, "Renewal notice skipped: email not configured");
    return;
  }
  if (!invoice.id) return;
  if (await billingEmailAlreadySent(RENEWAL_NOTICE_EVENT, "invoiceId", invoice.id)) return;

  const recipient = await resolveEmailAlertRecipient(userId);
  if ("error" in recipient) {
    logger.warn({ userId, error: recipient.error }, "Renewal notice skipped: no recipient");
    return;
  }

  const planLabels = summarizeInvoiceLines(invoice);
  const amountDue = invoice.amount_due ?? 0;
  if (amountDue <= 0) {
    logger.info({ userId, invoiceId: invoice.id }, "Renewal notice skipped: zero amount due");
    return;
  }

  const currency = invoice.currency ?? "gbp";
  const chargeDateUnix =
    invoice.next_payment_attempt ??
    invoice.period_end ??
    (invoice.status_transitions?.finalized_at ?? null);
  const chargeDateFormatted =
    chargeDateUnix != null ? formatBillingDate(chargeDateUnix) : "your next billing date";

  const settingsUrl = `${publicAppBaseUrl().replace(/\/$/, "")}/settings`;
  const subject = `Upcoming ValYoued renewal on ${chargeDateFormatted}`;
  const html = buildBillingRenewalReminderEmailHtml({
    planLabels,
    amountFormatted: formatStripeMoney(amountDue, currency),
    chargeDateFormatted,
    settingsUrl,
  });

  const sent = await sendHtmlEmail({ to: recipient.to, subject, html });
  if (!sent.ok) {
    logger.warn({ userId, invoiceId: invoice.id, error: sent.error }, "Renewal notice email failed");
    return;
  }

  await recordBillingEmailSent({
    userId,
    eventType: RENEWAL_NOTICE_EVENT,
    payload: { invoiceId: invoice.id, amountDue, currency },
  });
  logger.info({ userId, invoiceId: invoice.id }, "Renewal notice email sent");
}

/** Sent once when checkout completes and a subscription becomes active or trialing. */
export async function notifyBillingSubscriptionConfirmed(
  userId: string,
  sub: Stripe.Subscription,
): Promise<void> {
  if (!isEmailDeliveryConfigured()) return;
  if (!sub.id) return;
  if (await billingEmailAlreadySent(SUBSCRIPTION_CONFIRMED_EVENT, "subscriptionId", sub.id)) return;

  const recipient = await resolveEmailAlertRecipient(userId);
  if ("error" in recipient) {
    logger.warn({ userId, error: recipient.error }, "Subscription confirmation skipped: no recipient");
    return;
  }

  const { planLabels, amountCents, currency } = subscriptionChargeSummary(sub);
  const isTrial = sub.status === "trialing" && sub.trial_end != null;
  const renewalUnix = isTrial ? sub.trial_end! : sub.current_period_end;
  const renewalDateFormatted = formatBillingDate(renewalUnix);
  const amountFormatted = formatStripeMoney(amountCents, currency);
  const settingsUrl = `${publicAppBaseUrl().replace(/\/$/, "")}/settings`;

  const subject = isTrial
    ? `Your ValYoued trial is active (${planLabels.join(", ")})`
    : "Your ValYoued subscription is active";
  const html = buildBillingSubscriptionConfirmedEmailHtml({
    planLabels,
    amountFormatted,
    renewalDateFormatted,
    isTrial,
    settingsUrl,
  });

  const sent = await sendHtmlEmail({ to: recipient.to, subject, html });
  if (!sent.ok) {
    logger.warn({ userId, subscriptionId: sub.id, error: sent.error }, "Subscription confirmation email failed");
    return;
  }

  await recordBillingEmailSent({
    userId,
    eventType: SUBSCRIPTION_CONFIRMED_EVENT,
    payload: { subscriptionId: sub.id, status: sub.status },
  });
  logger.info({ userId, subscriptionId: sub.id }, "Subscription confirmation email sent");
}
