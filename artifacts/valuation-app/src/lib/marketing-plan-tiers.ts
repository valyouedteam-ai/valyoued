/** Shared copy aligned with api-server UserEntitlements and billing checkout. */
export type PlanCardVariant = "outline" | "default" | "secondary";

export type MarketingPlanCardDef = {
  title: string;
  subtitle?: string;
  price: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;
  variant: PlanCardVariant;
  highlight?: boolean;
};

export const PROFESSIONAL_TRIAL_DAYS_DEFAULT = 14;

export const MAIN_PLAN_CARDS: MarketingPlanCardDef[] = [
  {
    title: "Everyday · Free",
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
    title: "Everyday+",
    subtitle: "Full personal valuations",
    price: "£7.99/mo",
    bullets: [
      "Unlimited valuations policy once subscribed",
      "Full international arbitrage rows on valuation reports",
      "Configure monitor alerts for holdings (including email)",
      "Stronger comps grid and Everyday+ tooling in the app",
    ],
    ctaLabel: "Sign up and choose Everyday+",
    ctaHref: "/welcome",
    variant: "default",
  },
  {
    title: "Professional",
    subtitle: `${PROFESSIONAL_TRIAL_DAYS_DEFAULT}-day free trial · then billed monthly`,
    price: "£14.99/mo",
    bullets: [
      "Everything in Everyday+ plus seller-grade listing tone",
      "Advanced selling recommendations on new valuations",
      "Multiple desk dashboards so you can separate stock lanes",
      "Sharper reseller workflow links across History, Ads, and Markets",
    ],
    ctaLabel: "Sign up on the Professional track",
    ctaHref: "/welcome",
    variant: "secondary",
    highlight: true,
  },
];

/** Shown everywhere we market plans; Stripe wiring for the workspace lands in Phase 3. */
export const INHERITANCE_ADDON_CARD: MarketingPlanCardDef = {
  title: "Inheritance add-on",
  subtitle: "Everyday path upgrade",
  price: "Billed monthly at checkout",
  bullets: [
    "Optional portfolio workspace separate from your main holdings",
    "Colour-tinted workspace switcher keeps estate items visually distinct",
    "Pick which portfolio each valuation saves into",
    "Adds on alongside Everyday Free or Everyday+ billing",
  ],
  ctaLabel: "Tailor signup and ask about inheritance",
  ctaHref: "/welcome",
  variant: "outline",
};
