/** Shared copy aligned with api-server UserEntitlements and billing checkout. */
export type PlanCardVariant = "outline" | "default" | "secondary";

export type MarketingPlanCardDef = {
  title: string;
  subtitle?: string;
  price: string;
  /** Optional annual price display (UI only until Stripe annual prices ship). */
  priceAnnual?: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;
  variant: PlanCardVariant;
  highlight?: boolean;
  popularLabel?: string;
  /** Signed-in shoppers (pricing while logged in) alternate CTA, e.g. deep link Billing. */
  authenticatedCta?: { label: string; href: string };
};

export type PlanCompareColumn = "free" | "everyday_plus" | "professional";

export type PlanCompareRow = {
  label: string;
  free: string;
  everyday_plus: string;
  professional: string;
};

export type PricingFaqItem = { question: string; answer: string };

export const PROFESSIONAL_TRIAL_DAYS_DEFAULT = 14;

/** User-facing billing tier label from API/Stripe slug. */
export function planTierDisplayName(slug: string | null | undefined): string {
  switch (slug) {
    case "everyday_plus":
      return "Everyday";
    case "professional":
      return "Professional";
    case "none":
    case "free":
      return "Free";
    default:
      return slug ?? "Free";
  }
}

export const MAIN_PLAN_CARDS: MarketingPlanCardDef[] = [
  {
    title: "Free",
    subtitle: "Start without a card",
    price: "£0",
    bullets: [
      "5 valuations per calendar month (UTC)",
      "Basic valuations and basic listing drafts",
      "Regional snapshot only: no multi-market arbitrage rows",
      "No portfolio value-change emails or promotional alert toggles",
    ],
    ctaLabel: "Start free valuation",
    ctaHref: "/start",
    variant: "outline",
  },
  {
    title: "Everyday",
    subtitle: "Full personal valuations",
    price: "£7.99/mo",
    priceAnnual: "£6.49/mo",
    bullets: [
      "Unlimited valuations policy once subscribed",
      "Personal asset portfolio with confidence scores",
      "Refine valuations in place and portfolio health alerts",
      "Full arbitrage rows, monitor emails, and value nudges",
    ],
    ctaLabel: "Sign up and choose Everyday",
    ctaHref: "/welcome",
    variant: "default",
  },
  {
    title: "Professional",
    subtitle: `${PROFESSIONAL_TRIAL_DAYS_DEFAULT}-day free trial · then billed monthly`,
    price: "£14.99/mo",
    priceAnnual: "£12.49/mo",
    bullets: [
      "Everything in Everyday plus Market Watch and deal scoring",
      "Inventory pipeline, max buy price, and repricing alerts",
      "Platform-specific listing drafts",
      "Business exports, multiple desks, seller-grade listing tone",
    ],
    ctaLabel: "Sign up on the Professional track",
    ctaHref: "/welcome",
    variant: "secondary",
    highlight: true,
    popularLabel: "Most popular",
  },
];

export const PLAN_COMPARE_ROWS: PlanCompareRow[] = [
  {
    label: "Valuations per month",
    free: "5 (UTC calendar month)",
    everyday_plus: "Unlimited policy",
    professional: "Unlimited policy",
  },
  {
    label: "International arbitrage rows",
    free: "Snapshot only",
    everyday_plus: "Full grid on reports",
    professional: "Full grid on reports",
  },
  {
    label: "Monitor email alerts",
    free: "Not included",
    everyday_plus: "Included",
    professional: "Included",
  },
  {
    label: "Listing draft tone",
    free: "Basic",
    everyday_plus: "Full personal",
    professional: "Seller-grade",
  },
  {
    label: "Portfolio analytics and refine",
    free: "Not included",
    everyday_plus: "Confidence, health strip, refine flow",
    professional: "Included",
  },
  {
    label: "Market Watch and inventory",
    free: "Not included",
    everyday_plus: "Not included",
    professional: "Deal score, pipeline, exports",
  },
  {
    label: "Trading desks / workspaces",
    free: "Single portfolio",
    everyday_plus: "Single portfolio",
    professional: "Multiple desks",
  },
  {
    label: "Inheritance add-on",
    free: "Optional add-on",
    everyday_plus: "Optional add-on",
    professional: "Optional add-on",
  },
];

export const PRICING_FAQ: PricingFaqItem[] = [
  {
    question: "Can I use ValYoued for free?",
    answer:
      "Yes. Free includes five valuations each calendar month (UTC), basic listing drafts, and a regional snapshot on reports. Upgrade when you want unlimited valuations, arbitrage rows, or monitor emails.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Paid plans cancel through Billing in Settings. You keep access through the end of the current billing period. Free never requires a card.",
  },
  {
    question: "How does the Professional trial work?",
    answer: `Professional includes a ${PROFESSIONAL_TRIAL_DAYS_DEFAULT}-day trial when you subscribe through checkout. After the trial, billing continues monthly unless you cancel.`,
  },
  {
    question: "What is the inheritance add-on?",
    answer:
      "It spins up a separate portfolio workspace for estate rehearsal, heirs, or heirloom tracking alongside your main ledger. It bills monthly on top of Free or Everyday.",
  },
  {
    question: "Do you offer annual billing?",
    answer:
      "Annual pricing is shown for reference. Checkout currently bills monthly through Stripe. Annual plans will use the same feature set when they launch.",
  },
  {
    question: "Which payment methods do you accept?",
    answer:
      "Stripe handles checkout with major debit and credit cards. Your card details never touch ValYoued servers directly.",
  },
];

/** Shown everywhere we market plans; Stripe wiring for the workspace lands in Phase 3. */
export const INHERITANCE_ADDON_CARD: MarketingPlanCardDef = {
  title: "Inheritance add-on",
  subtitle: "Everyday path upgrade",
  price: "Billed monthly at checkout",
  bullets: [
    "Optional portfolio workspace separate from your main holdings",
    "Easier inheritance management with a workspace split out from your main portfolio",
    "Pick which portfolio each valuation saves into",
    "Adds on alongside Free or Everyday billing",
  ],
  ctaLabel: "Sign up, then add inheritance in Billing",
  ctaHref: "/sign-up",
  authenticatedCta: {
    label: "Learn about the inheritance ledger",
    href: "/inheritance",
  },
  variant: "outline",
};
