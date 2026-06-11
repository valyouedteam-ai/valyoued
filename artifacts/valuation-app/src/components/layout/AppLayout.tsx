import { ReactNode, useMemo, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import type { Portfolio } from "@workspace/api-client-react";
import { useUser, useClerk } from "@clerk/react";
import {
  Briefcase,
  Calculator,
  Globe2,
  Landmark,
  LayoutDashboard,
  LogOut,
  Lock,
  Megaphone,
  Menu,
  PanelsTopLeft,
  Settings,
  ShieldHalf,
  LineChart,
  Package,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBillingSummary } from "@/hooks/use-billing-summary";
import { SellerPersonaProvider, useSellerPersona } from "@/hooks/use-seller-persona";
import { ProPreviewToggle } from "@/components/ProPreviewToggle";
import { StubBillingPlanSwitcher } from "@/components/dev/StubBillingPlanSwitcher";
import { useOptionalStubBillingPlanDev } from "@/context/StubBillingPlanDevContext";
import { useAuthStubContext } from "@/context/AuthStubContext";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PortfolioWorkspaceStrip } from "@/components/layout/PortfolioWorkspaceStrip";
import { AppSearch } from "@/components/layout/AppSearch";
import { WorkspaceGuideTour } from "@/components/onboarding/WorkspaceGuideTour";
import {
  mergePortfolioHref,
  PortfolioWorkspaceProvider,
  usePortfolioWorkspace,
} from "@/context/PortfolioWorkspaceContext";
import { isDevBillingUiEnabled } from "@/lib/dev-billing-ui";

const BASE = (import.meta as any).env?.BASE_URL ?? "/";
const LOGO_URL = `${BASE.replace(/\/$/, "")}/logo.png`;
const SHOW_DEV_PRO_CHROME_PREVIEW = import.meta.env.DEV;

/** Dev / optional preview: Free / Everyday / Professional plus inheritance (see `isDevBillingUiEnabled`). */
const SHOW_STUB_PLAN_TOGGLE = isDevBillingUiEnabled();

type NavItem = {
  href: string;
  label: string;
  icon: typeof Briefcase;
  navTitle?: string;
  /** When set, skips merging the active workspace `?portfolio=` tail (avoid corrupting hashes or doubling params). */
  skipPortfolioQuery?: boolean;
  /** Target id for the first-time workspace guide spotlight. */
  guideTarget?: string;
  /** Visible on Free but links to upgrade instead of the feature route. */
  locked?: boolean;
};

const NAV_MARKETS: NavItem = {
  href: "/markets",
  label: "Regions",
  icon: Globe2,
  navTitle: "Regions and pricing context",
};

const navWorkspace: NavItem[] = [
  { href: "/dashboard", label: "Portfolio", icon: Briefcase },
  { href: "/estimate/new", label: "Valuate", icon: Calculator, guideTarget: "nav-valuate" },
  {
    href: "/estimates",
    label: "Recent",
    icon: LayoutDashboard,
    navTitle: "Recent valuations on this workspace (formerly History).",
  },
];

const navInsights: NavItem[] = [
  {
    href: "/inheritance",
    label: "Inheritance",
    icon: Landmark,
    navTitle:
      "Separate workspace for estates, heirs, and heirlooms. Open this hub before valuing heirlooms or someone else's items.",
    skipPortfolioQuery: true,
    guideTarget: "nav-inheritance",
  },
  { href: "/listings", label: "Ads", icon: Megaphone },
];

function normalizeLocationSearch(search: string): string {
  if (!search || search.startsWith("?")) return search;
  return `?${search}`;
}

/** Match full nav target including `?portfolio=` query and `#hash`. */
function routeMatchesNavHref(pathname: string, rawSearchParam: string, navHref: string): boolean {
  const rawSearch = normalizeLocationSearch(rawSearchParam);

  const hashIdx = navHref.indexOf("#");
  const base = hashIdx >= 0 ? navHref.slice(0, hashIdx) : navHref;
  const hashNeedle = hashIdx >= 0 ? navHref.slice(hashIdx + 1) : "";

  const qIdx = base.indexOf("?");
  const pathPart = qIdx >= 0 ? base.slice(0, qIdx) : base;
  const queryPart = qIdx >= 0 ? base.slice(qIdx + 1) : "";

  if (pathname !== pathPart) return false;

  if (queryPart.length > 0) {
    const expected = new URLSearchParams(queryPart);
    const q = rawSearch.startsWith("?") ? rawSearch.slice(1) : rawSearch;
    const current = new URLSearchParams(q);
    for (const [k, v] of expected) {
      if (current.get(k) !== v) return false;
    }
  }

  if (hashNeedle.length > 0) {
    if (typeof window === "undefined") return false;
    return window.location.hash === `#${hashNeedle}`;
  }

  return true;
}

/** Active when `pathname`/`search` match the navigated URL (queries, hashes, or path-prefix sections). */
function isResolvedNavActive(pathname: string, rawSearchParam: string, resolvedHref: string): boolean {
  if (resolvedHref.includes("?") || resolvedHref.includes("#")) {
    return routeMatchesNavHref(pathname, rawSearchParam, resolvedHref);
  }
  const pathOnly = resolvedHref.split("?")[0]?.split("#")[0] ?? resolvedHref;
  return pathname === pathOnly || (pathOnly !== "/dashboard" && pathname.startsWith(pathOnly));
}

function portfolioWorkspaceHref(
  portfolio: Portfolio | undefined,
  primary: Portfolio | null | undefined,
  allPortfolios: Portfolio[] | undefined,
): string {
  const primId = primary?.id ?? null;
  const defaultId = primId ?? allPortfolios?.[0]?.id ?? null;
  if (!portfolio?.id) return "/dashboard";
  if (defaultId != null && portfolio.id === defaultId) return "/dashboard";
  return mergePortfolioHref("/dashboard", `?portfolio=${encodeURIComponent(portfolio.id)}`);
}

function buildInsightNavigation(input: {
  paidTier: boolean;
  professionalPlan: boolean;
  portfolios: Portfolio[] | undefined;
  primaryPortfolio: Portfolio | null;
}): NavItem[] {
  const rows: NavItem[] = [...navInsights];
  const { portfolios, primaryPortfolio, paidTier, professionalPlan } = input;

  rows.push({
    ...NAV_MARKETS,
    locked: !paidTier,
  });
  rows.push({
    href: "/alerts",
    label: "Alerts",
    icon: Bell,
    navTitle: "Portfolio value and health notifications",
    locked: !paidTier,
  });

  rows.push({
    href: "/market-watch",
    label: "Watch",
    icon: LineChart,
    navTitle: "Market Watch niches and buy-below targets",
    locked: !professionalPlan,
  });
  rows.push({
    href: "/inventory",
    label: "Inventory",
    icon: Package,
    navTitle: "Inventory pipeline and business exports",
    locked: !professionalPlan,
  });

  if (professionalPlan) {
    const desks = [...(portfolios?.filter((p) => p.purpose === "pro_board") ?? [])].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const desk = desks[0];
    const href = desk?.id ? portfolioWorkspaceHref(desk, primaryPortfolio, portfolios) : "/dashboard";
    rows.push({
      href,
      label: "Desk",
      icon: PanelsTopLeft,
      navTitle:
        "Jump to your latest trading desk workspace. Create more desks from Portfolio (Professional) to split stock lanes.",
      skipPortfolioQuery: true,
    });
  }

  return rows;
}

function useDashboardNavInsights(): NavItem[] {
  const stubDev = useOptionalStubBillingPlanDev();
  const { data: billing } = useBillingSummary();
  const { portfolios, primaryPortfolio } = usePortfolioWorkspace();
  const paidTier = Boolean(billing?.hasPaidValuationTier);
  const professionalPlan = billing?.planSlug === "professional";

  return useMemo(() => {
    let rows = buildInsightNavigation({
      paidTier,
      professionalPlan,
      portfolios,
      primaryPortfolio,
    });
    if (SHOW_STUB_PLAN_TOGGLE && stubDev !== null && !stubDev.inheritanceAddon) {
      rows = rows.filter((item) => item.href !== "/inheritance");
    }
    return rows;
  }, [paidTier, professionalPlan, portfolios, primaryPortfolio, stubDev?.inheritanceAddon]);
}

function resolveNavHref(item: NavItem, portfolioQuerySuffix: string): string {
  if (item.skipPortfolioQuery || !portfolioQuerySuffix?.length) return item.href;
  return mergePortfolioHref(item.href, portfolioQuerySuffix);
}

function NavLink({
  item,
  pathname,
  search,
  onNavigate,
  className,
  block,
  portfolioHrefSuffix,
  sidebar,
}: {
  item: NavItem;
  pathname: string;
  search: string;
  onNavigate?: () => void;
  className?: string;
  block?: boolean;
  /** Optional `?portfolio=` tail from the active workspace. */
  portfolioHrefSuffix?: string;
  sidebar?: boolean;
}) {
  const Icon = item.icon;
  const resolvedHref = resolveNavHref(item, portfolioHrefSuffix ?? "");
  const href = item.locked ? "/pricing#plans" : resolvedHref;
  const active = !item.locked && isResolvedNavActive(pathname, search, resolvedHref);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(block && "block w-full")}
      {...(item.navTitle ? { title: item.locked ? `${item.navTitle} (upgrade to unlock)` : item.navTitle, "aria-label": item.label } : {})}
    >
      <span
        data-workspace-guide={item.guideTarget}
        className={cn(
          sidebar
            ? "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors"
            : "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition-all",
          block && !sidebar && "w-full flex",
          item.locked
            ? "text-muted-foreground/90 hover:bg-muted/60 hover:text-foreground"
            : active
              ? sidebar
                ? "bg-accent/12 text-foreground shadow-sm ring-1 ring-accent/25"
                : "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          className,
        )}
      >
        <Icon className={cn("h-4 w-4 shrink-0", active && !item.locked ? "opacity-100" : "opacity-80")} />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {item.locked ? (
          <Lock className="h-3.5 w-3.5 shrink-0 text-accent/80" aria-hidden />
        ) : null}
      </span>
    </Link>
  );
}

function SidebarSectionTitle({ children }: { children: ReactNode }) {
  return <p className="px-3 pb-1 text-ui-caps text-muted-foreground">{children}</p>;
}

function SidebarNavSection({
  title,
  items,
  pathname,
  search,
  portfolioHrefSuffix,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  search: string;
  portfolioHrefSuffix: string;
}) {
  return (
    <div className="space-y-1">
      <SidebarSectionTitle>{title}</SidebarSectionTitle>
      <nav className="flex flex-col gap-0.5">
        {items.map((item) => (
          <NavLink
            key={`${item.label}:${item.href}`}
            item={item}
            pathname={pathname}
            search={search}
            block
            sidebar
            portfolioHrefSuffix={portfolioHrefSuffix}
          />
        ))}
      </nav>
    </div>
  );
}

function UserMenuStub({ compact }: { compact?: boolean }) {
  return (
    <Link
      href="/profile"
      aria-label="View profile"
      className={cn(
        "flex items-center gap-2 rounded-full border border-border/80 bg-card px-2 py-1 pr-3 shadow-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        compact && "pr-2",
      )}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
        D
      </div>
      {!compact ? (
        <div className="min-w-0">
          <div className="truncate text-xs font-medium">Dev stub</div>
          <div className="text-ui-meta text-muted-foreground">No session</div>
        </div>
      ) : null}
    </Link>
  );
}

function UserMenuClerk({ compact }: { compact?: boolean }) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  if (!isLoaded || !user) return null;
  const display =
    user.fullName || user.primaryEmailAddress?.emailAddress || user.username || "Account";
  const initial = (display[0] ?? "?").toUpperCase();
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full border border-border/80 bg-card py-1 pl-1 shadow-sm",
        compact ? "pr-1" : "pr-2",
      )}
    >
      <Link
        href="/profile"
        aria-label="View profile"
        className={cn(
          "flex min-w-0 items-center gap-2 rounded-full py-0.5 pl-0.5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          compact ? "pr-0.5" : "pr-1",
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold">
          {user.imageUrl ? (
            <img src={user.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </div>
        {!compact ? (
          <div className="hidden min-w-0 max-w-[140px] sm:block">
            <div className="truncate text-xs font-medium">{display}</div>
          </div>
        ) : null}
      </Link>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
        onClick={() => signOut()}
        title="Sign out"
        data-testid="sign-out-btn"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}

function UserMenu({ compact }: { compact?: boolean }) {
  const authStub = useAuthStubContext();
  if (authStub) return <UserMenuStub compact={compact} />;
  return <UserMenuClerk compact={compact} />;
}

function PlanBrief({ className, block }: { className?: string; block?: boolean }) {
  const { data } = useBillingSummary();
  const { persona, isProfessional } = useSellerPersona();
  const paidApi = Boolean(data?.hasPaidValuationTier);
  const remaining = !paidApi ? data?.valuationsRemainingFree : null;
  const briefHref = paidApi ? "/settings" : "/pricing#plans";

  const trackName = isProfessional ? "Professional desk" : "Everyday";

  return (
    <Link
      href={briefHref}
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1.5 shadow-sm transition-colors hover:bg-muted/35",
        paidApi ? "border-accent/35 bg-accent/10" : "border-border/80 bg-card",
        block && "w-full justify-between",
        className,
      )}
      title={
        paidApi ? "Opens Settings for receipts, billing, and plan changes." : "View plans and upgrade on the pricing page."
      }
    >
      <div className="flex min-w-0 flex-col text-left leading-tight">
        {paidApi ? (
          <span className="text-xs font-medium text-foreground">{trackName}</span>
        ) : (
          <>
            <span className="text-xs font-medium text-foreground">Free</span>
            {persona ? (
              <span className="text-[10px] text-muted-foreground">Track: {trackName}</span>
            ) : null}
            {remaining != null ? (
              <span className="max-w-[210px] truncate text-[10px] text-muted-foreground">
                {remaining} valuations left · upgrade
              </span>
            ) : null}
          </>
        )}
      </div>
    </Link>
  );
}

function MobileNavSheet({ insightNav }: { insightNav: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const [pathname] = useLocation();
  const search = useSearch();
  const { portfolioQuerySuffix } = usePortfolioWorkspace();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0 rounded-full md:hidden" aria-label="Open menu" data-workspace-guide="mobile-menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-[min(100vw-2rem,320px)] flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border px-6 py-5 text-left">
          <SheetTitle className="font-brand text-xl">Menu</SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-5">
          <div>
            <div className="text-ui-caps text-muted-foreground mb-2 px-2">Navigate</div>
            <div className="flex flex-col gap-1">
              {navWorkspace.map((item) => (
                <NavLink
                  key={`${item.label}:${item.href}`}
                  item={item}
                  pathname={pathname}
                  search={search}
                  block
                  portfolioHrefSuffix={portfolioQuerySuffix}
                  onNavigate={() => setOpen(false)}
                  className="w-full !justify-start rounded-xl"
                />
              ))}
            </div>
          </div>
          <div>
            <div className="text-ui-caps text-muted-foreground mb-2 px-2">Insights</div>
            <div className="flex flex-col gap-1">
              {insightNav.map((item) => (
                <NavLink
                  key={`${item.label}:${item.href}`}
                  item={item}
                  pathname={pathname}
                  search={search}
                  block
                  portfolioHrefSuffix={portfolioQuerySuffix}
                  onNavigate={() => setOpen(false)}
                  className="w-full !justify-start rounded-xl"
                />
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 px-2">
            <p className="w-full text-ui-caps text-muted-foreground px-2">Shortcuts</p>
            <Link href={mergePortfolioHref("/settings", portfolioQuerySuffix)} onClick={() => setOpen(false)} className="flex-1 min-w-[calc(50%-4px)]" data-workspace-guide="settings">
              <Button variant="outline" className="h-11 w-full justify-start gap-2 rounded-xl" aria-label="Settings">
                <Settings className="h-4 w-4 shrink-0" />
                Settings
              </Button>
            </Link>
            <Link href="/admin" onClick={() => setOpen(false)} className="flex-1 min-w-[calc(50%-4px)]">
              <Button variant="outline" className="h-11 w-full justify-start gap-2 rounded-xl" aria-label="Admin dashboard">
                <ShieldHalf className="h-4 w-4 shrink-0" />
                Admin
              </Button>
            </Link>
          </div>
        </div>
        <div className="mt-auto space-y-4 border-t border-border px-4 py-5">
          {SHOW_STUB_PLAN_TOGGLE ? null : <PlanBrief block className="w-full justify-between" />}
          <UserMenu />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AppLayoutShell({ children }: { children: ReactNode }) {
  const [pathname] = useLocation();
  const search = useSearch();
  const isMobile = useIsMobile();
  const { portfolioQuerySuffix } = usePortfolioWorkspace();
  const insightNav = useDashboardNavInsights();

  return (
    <div className="no-print flex min-h-[100dvh] bg-background">
      {/* Desktop sidebar: logo left, grouped nav, clearer hierarchy */}
      <aside
        className="hidden lg:sticky lg:top-0 lg:flex lg:h-[100dvh] w-[15.5rem] shrink-0 flex-col self-start border-r border-border/60 bg-card/40"
        data-workspace-guide="main-nav"
      >
        <div className="flex flex-col gap-1 px-4 py-5">
          <Link
            href={mergePortfolioHref("/dashboard", portfolioQuerySuffix)}
            className="flex items-center gap-3 rounded-xl py-1 pr-1 transition-opacity hover:opacity-90"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background shadow-sm ring-1 ring-border/60">
              <img src={LOGO_URL} alt="ValYoued" className="h-7 w-7 object-contain" />
            </div>
            <span className="font-brand text-lg text-foreground">ValYoued</span>
          </Link>
        </div>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 pb-4">
          <SidebarNavSection
            title="Workspace"
            items={navWorkspace}
            pathname={pathname}
            search={search}
            portfolioHrefSuffix={portfolioQuerySuffix}
          />
          <SidebarNavSection
            title="Insights"
            items={insightNav}
            pathname={pathname}
            search={search}
            portfolioHrefSuffix={portfolioQuerySuffix}
          />
        </div>

        <div className="space-y-3 border-t border-border/50 px-3 py-4">
          <SidebarNavSection
            title="Account"
            items={[
              {
                href: "/settings",
                label: "Settings",
                icon: Settings,
                guideTarget: "settings",
              },
              { href: "/admin", label: "Admin", icon: ShieldHalf },
            ]}
            pathname={pathname}
            search={search}
            portfolioHrefSuffix={portfolioQuerySuffix}
          />
          {SHOW_STUB_PLAN_TOGGLE ? (
            <div className="space-y-1">
              <SidebarSectionTitle>Subscription</SidebarSectionTitle>
              <StubBillingPlanSwitcher />
            </div>
          ) : (
            <>
              {SHOW_DEV_PRO_CHROME_PREVIEW ? <ProPreviewToggle /> : null}
              {!SHOW_STUB_PLAN_TOGGLE ? <PlanBrief block className="mx-1 w-full justify-between" /> : null}
            </>
          )}
          <div className="px-1">
            <UserMenu />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-xl">
          <header className="lg:hidden">
            <div className="flex w-full items-center gap-3 px-4 py-3">
              <Link
                href={mergePortfolioHref("/dashboard", portfolioQuerySuffix)}
                className="flex shrink-0 items-center gap-2.5 rounded-xl py-1 pr-2"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-card shadow-sm ring-1 ring-border/60">
                  <img src={LOGO_URL} alt="ValYoued" className="h-6 w-6 object-contain" />
                </div>
                <span className="font-brand text-lg text-foreground">ValYoued</span>
              </Link>
              <div className="ml-auto flex shrink-0 items-center gap-2">
                {SHOW_STUB_PLAN_TOGGLE ? <StubBillingPlanSwitcher compact /> : null}
                <UserMenu compact />
                <MobileNavSheet insightNav={insightNav} />
              </div>
            </div>
            {!SHOW_STUB_PLAN_TOGGLE ? (
              <div className="flex flex-wrap items-center justify-center gap-2 border-t border-border/40 bg-muted/20 px-4 py-2">
                {SHOW_DEV_PRO_CHROME_PREVIEW ? <ProPreviewToggle compact /> : null}
                <PlanBrief />
              </div>
            ) : null}
          </header>

          <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:py-2.5">
            <AppSearch insightNav={insightNav} />
          </div>
          <PortfolioWorkspaceStrip />
        </div>

        <main className="mesh-bg flex-1">
          <div className="pointer-events-none fixed inset-0 -z-10 opacity-[0.35]">
            <div className="grid-bg absolute inset-0" />
          </div>
          <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
            {children}
          </div>
        </main>
      </div>
      <WorkspaceGuideTour />
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <PortfolioWorkspaceProvider>
      <SellerPersonaProvider>
        <AppLayoutShell>{children}</AppLayoutShell>
      </SellerPersonaProvider>
    </PortfolioWorkspaceProvider>
  );
}
