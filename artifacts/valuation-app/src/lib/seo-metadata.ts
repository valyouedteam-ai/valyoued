/** Public site URL for canonical and Open Graph URLs. Override with VITE_PUBLIC_SITE_ORIGIN in env (no trailing slash). */
export function siteOrigin(): string {
  const configured = typeof import.meta.env.VITE_PUBLIC_SITE_ORIGIN === "string"
    ? import.meta.env.VITE_PUBLIC_SITE_ORIGIN.trim().replace(/\/$/, "")
    : "";
  if (configured) return configured;
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }
  return "https://www.valyoued.ai";
}

export type PageSeo = { title: string; description: string };

const TITLE_SUFFIX = "ValYoued";

/** Default home / crawl fallback (must stay aligned with index.html defaults). */
export const DEFAULT_PUBLIC_SEO: PageSeo = {
  title: `${TITLE_SUFFIX} · valuations and portfolio tracking`,
  description:
    "ValYoued brings AI-backed valuations for collectibles and everyday assets: structured ranges, portfolio buckets, regional comps, and listing drafts so you sell with clearer market context.",
};

const BY_PATH = new Map<string, PageSeo>([
  [
    "/",
    DEFAULT_PUBLIC_SEO,
  ],
  [
    "/start",
    {
      title: `Start a valuation · ${TITLE_SUFFIX}`,
      description:
        "Describe or photograph a supported asset and get a structured, market-backed valuation range with regional context before you list.",
    },
  ],
  [
    "/pricing",
    {
      title: `Pricing · ${TITLE_SUFFIX}`,
      description:
        "Compare ValYoued plans across Everyday and Luxury tiers, add-ons such as inheritance workspaces, and desk-ready exports for resale professionals.",
    },
  ],
  [
    "/welcome",
    {
      title: `Welcome · ${TITLE_SUFFIX}`,
      description:
        "Tell ValYoued how you plan to trade or collect so we can tailor onboarding, workspaces, and the right valuation depth from day one.",
    },
  ],
  [
    "/about",
    {
      title: `How it works · ${TITLE_SUFFIX}`,
      description:
        "From a photo or short description to live-market comps and listing drafts: the four-step ValYoued flow for tracking and pricing what you own.",
    },
  ],
  [
    "/privacy",
    {
      title: `Privacy · ${TITLE_SUFFIX}`,
      description:
        "How ValYoued handles valuation data, account details, subprocessors, retention, export, deletion requests, and your privacy choices.",
    },
  ],
  [
    "/sign-in",
    {
      title: `Sign in · ${TITLE_SUFFIX}`,
      description: "Sign in to ValYoued to continue valuations, portfolios, inheritance rehearsal, and desk workflows.",
    },
  ],
  [
    "/sign-up",
    {
      title: `Create account · ${TITLE_SUFFIX}`,
      description:
        "Create a free ValYoued account for guided valuations, saved reports, portfolios, listings help, and optional paid tiers.",
    },
  ],
  [
    "/dashboard",
    {
      title: `Dashboard · ${TITLE_SUFFIX}`,
      description: "Your signed-in ValYoued home for recent valuations, portfolio signals, markets previews, and next actions.",
    },
  ],
  [
    "/estimate/new",
    {
      title: `New valuation · ${TITLE_SUFFIX}`,
      description:
        "Run a guided ValYoued valuation: pick an asset lane, confirm condition and region, then review comps-backed ranges.",
    },
  ],
  [
    "/estimates",
    {
      title: `Your valuations · ${TITLE_SUFFIX}`,
      description: "Browse saved ValYoued valuation reports with updated comps context and export-ready summaries.",
    },
  ],
  [
    "/inheritance",
    {
      title: `Inheritance workspace · ${TITLE_SUFFIX}`,
      description:
        "Rehearse estate-related holdings in a dedicated ValYoued workspace with heirloom-friendly labels and rollup views.",
    },
  ],
  [
    "/portfolio",
    {
      title: `Portfolio · ${TITLE_SUFFIX}`,
      description:
        "Organize assets into Everyday and Luxury shelves, reconcile rollups, and jump back into valuations or listings from one hub.",
    },
  ],
  [
    "/stats",
    {
      title: `Portfolio stats · ${TITLE_SUFFIX}`,
      description: "Snapshot rollups and shelf mix across your ValYoued portfolio workspaces.",
    },
  ],
  [
    "/markets",
    {
      title: `Markets cockpit · ${TITLE_SUFFIX}`,
      description:
        "Skim demand and pricing context ValYoued sources for your regions and asset lanes before you price or list.",
    },
  ],
  [
    "/listings",
    {
      title: `Listing drafts · ${TITLE_SUFFIX}`,
      description:
        "Turn valuation details into marketplace-ready titles, descriptions, and photo guidance tailored to how each asset class sells.",
    },
  ],
  [
    "/settings",
    {
      title: `Settings · ${TITLE_SUFFIX}`,
      description: "Manage ValYoued account email, billing, inheritance add-ons, exports, and developer preview toggles.",
    },
  ],
  [
    "/profile",
    {
      title: `Profile · ${TITLE_SUFFIX}`,
      description: "View your ValYoued account identifiers, session summary, and linked sign-in details.",
    },
  ],
  [
    "/admin",
    {
      title: `Admin · ${TITLE_SUFFIX}`,
      description: "Internal ValYoued admin dashboards for operators with the right access.",
    },
  ],
  [
    "/welcome/continue",
    {
      title: `Continue onboarding · ${TITLE_SUFFIX}`,
      description: "Finish tailoring ValYoued after sign-up so the product matches how you trade or collect.",
    },
  ],
]);

const ESTIMATE_DETAIL_DESC =
  "Read a saved ValYoued valuation report with headline range, comps, seller playbook cues, regional notes, and print-friendly layout.";

function normalizePath(path: string): string {
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

/** Resolve crawl-friendly title and meta description for the current in-app path. */
export function seoForPath(pathname: string): PageSeo {
  const path = normalizePath(pathname || "/");

  const exact = BY_PATH.get(path);
  if (exact) return exact;

  if (path.startsWith("/estimates/") && path !== "/estimates") {
    return {
      title: `Valuation report · ${TITLE_SUFFIX}`,
      description: ESTIMATE_DETAIL_DESC,
    };
  }

  return {
    title: `${TITLE_SUFFIX}`,
    description: DEFAULT_PUBLIC_SEO.description,
  };
}
