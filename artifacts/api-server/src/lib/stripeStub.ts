function truthy(v: string | undefined): boolean {
  return v === "1" || v?.toLowerCase() === "true";
}

/** Skip real Stripe SDK calls — for local UX without dashboard keys. */
export function isStripeStubMode(): boolean {
  return truthy(process.env.STRIPE_STUB_MODE);
}
