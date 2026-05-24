import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import {
  Briefcase,
  Calculator,
  LayoutDashboard,
  LibrarySquare,
  LogOut,
  Megaphone,
  Menu,
  Settings,
  ShieldHalf,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBillingSummary } from "@/hooks/use-billing-summary";
import { useSellerPersona } from "@/hooks/use-seller-persona";
import { ProPreviewToggle } from "@/components/ProPreviewToggle";
import { useAuthStubContext } from "@/context/AuthStubContext";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  mergePortfolioHref,
  PortfolioWorkspaceProvider,
  usePortfolioWorkspace,
} from "@/context/PortfolioWorkspaceContext";

const BASE = (import.meta as any).env?.BASE_URL ?? "/";
const LOGO_URL = `${BASE.replace(/\/$/, "")}/logo.png`;
const SHOW_DEV_PRO_CHROME_PREVIEW = import.meta.env.DEV;

type NavItem = { href: string; label: string; icon: typeof LibrarySquare };

const navWorkspace: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LibrarySquare },
  { href: "/estimate/new", label: "Valuate", icon: Calculator },
  { href: "/estimates", label: "History", icon: LayoutDashboard },
];

const navInsights: NavItem[] = [
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/listings", label: "Ads", icon: Megaphone },
];

function NavLink({
  item,
  active,
  onNavigate,
  className,
  block,
  portfolioHrefSuffix,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
  className?: string;
  block?: boolean;
  /** Optional `?portfolio=` tail from the active workspace. */
  portfolioHrefSuffix?: string;
}) {
  const Icon = item.icon;
  const href =
    portfolioHrefSuffix && portfolioHrefSuffix.length > 0
      ? mergePortfolioHref(item.href, portfolioHrefSuffix)
      : item.href;
  return (
    <Link href={href} onClick={onNavigate} className={cn(block && "block w-full")}>
      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-all",
          block && "w-full flex",
          active
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          className,
        )}
      >
        <Icon className={cn("h-4 w-4 shrink-0", active ? "opacity-100" : "opacity-80")} />
        {item.label}
      </span>
    </Link>
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
  const uiLabel = paidApi ? "Pro valuation access" : "Free valuation plan";
  const remaining = !paidApi ? data?.valuationsRemainingFree : null;

  return (
    <Link
      href="/settings"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-sm transition-colors hover:bg-muted/35",
        paidApi ? "border-accent/35 bg-accent/10" : "border-border/80 bg-card",
        block && "w-full justify-between",
        className,
      )}
      title={
        paidApi ? "Stripe shows an active paid valuation tier. Opens Settings for receipts and upgrades." : "Open billing and free valuation limits."
      }
    >
      <Sparkles className={cn("h-4 w-4 shrink-0", paidApi ? "text-accent" : "text-muted-foreground")} />
      <div className="flex min-w-0 flex-col text-left leading-tight">
        <span className="text-xs font-medium text-foreground">{uiLabel}</span>
        {persona ? (
          <span className="text-[10px] text-muted-foreground">
            Track: {isProfessional ? "Professional desk" : "Everyday steward"}
          </span>
        ) : null}
        {!paidApi && remaining != null ? (
          <span className="max-w-[210px] truncate text-[10px] text-muted-foreground">
            {remaining} valuations left · upgrade
          </span>
        ) : paidApi ? (
          <span className="max-w-[210px] truncate text-[10px] text-muted-foreground">
            Paid on Stripe · see Settings for details
          </span>
        ) : null}
      </div>
    </Link>
  );
}

function MobileNavSheet() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const { portfolioQuerySuffix } = usePortfolioWorkspace();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0 rounded-full md:hidden" aria-label="Open menu">
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
                  key={item.href}
                  item={item}
                  block
                  portfolioHrefSuffix={portfolioQuerySuffix}
                  active={location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href))}
                  onNavigate={() => setOpen(false)}
                  className="w-full !justify-start rounded-xl"
                />
              ))}
            </div>
          </div>
          <div>
            <div className="text-ui-caps text-muted-foreground mb-2 px-2">Insights</div>
            <div className="flex flex-col gap-1">
              {navInsights.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  block
                  portfolioHrefSuffix={portfolioQuerySuffix}
                  active={location === item.href || location.startsWith(item.href)}
                  onNavigate={() => setOpen(false)}
                  className="w-full !justify-start rounded-xl"
                />
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 px-2">
            <p className="w-full text-ui-caps text-muted-foreground px-2">Shortcuts</p>
            <Link href={mergePortfolioHref("/settings", portfolioQuerySuffix)} onClick={() => setOpen(false)} className="flex-1 min-w-[calc(50%-4px)]">
              <Button variant="outline" className="h-11 w-full justify-start gap-2 rounded-xl" aria-label="Settings">
                <Settings className="h-4 w-4 shrink-0" />
                Settings
              </Button>
            </Link>
            <Link href="/admin" onClick={() => setOpen(false)} className="flex-1 min-w-[calc(50%-4px)]">
              <Button variant="outline" className="h-11 w-full justify-start gap-2 rounded-xl" aria-label="Team dashboard">
                <ShieldHalf className="h-4 w-4 shrink-0" />
                Team
              </Button>
            </Link>
          </div>
        </div>
        <div className="mt-auto space-y-4 border-t border-border px-4 py-5">
          <PlanBrief block className="w-full justify-between" />
          <UserMenu />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AppLayoutShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const { portfolioQuerySuffix } = usePortfolioWorkspace();
  const isActive = (href: string) =>
    location === href || (href !== "/dashboard" && location.startsWith(href));

  return (
    <div className="no-print flex min-h-[100dvh] flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-xl supports-[backdrop-filter]:bg-background/65">
        <div className="flex w-full items-center gap-3 px-4 py-3 sm:px-6 lg:gap-4">
          <Link
            href={mergePortfolioHref("/dashboard", portfolioQuerySuffix)}
            className="flex shrink-0 items-center gap-2.5 rounded-xl py-1 pr-2 transition-opacity hover:opacity-90"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-sm ring-1 ring-border/60">
              <img src={LOGO_URL} alt="ValYoued" className="h-7 w-7 object-contain" />
            </div>
            <span className="font-brand text-xl text-foreground hidden min-[400px]:inline">
              ValYoued
            </span>
          </Link>

          <nav className="hidden min-w-0 flex-1 justify-center md:flex">
            <div className="flex max-w-full items-center gap-1 overflow-x-auto scrollbar-none rounded-full border border-border/60 bg-muted/40 p-1">
              {navWorkspace.map((item) => (
                <NavLink key={item.href} item={item} active={isActive(item.href)} portfolioHrefSuffix={portfolioQuerySuffix} />
              ))}
              <Separator orientation="vertical" className="mx-1 h-7 bg-border/80" />
              {navInsights.map((item) => (
                <NavLink key={item.href} item={item} active={isActive(item.href)} portfolioHrefSuffix={portfolioQuerySuffix} />
              ))}
            </div>
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            {SHOW_DEV_PRO_CHROME_PREVIEW && !isMobile ? <ProPreviewToggle /> : null}
            {!isMobile ? <PlanBrief className="hidden lg:flex" /> : null}
            <Link href={mergePortfolioHref("/settings", portfolioQuerySuffix)} title="Settings" aria-label="Settings" className="hidden md:block">
              <Button
                variant={isActive("/settings") ? "secondary" : "ghost"}
                size="icon"
                className={cn("h-9 w-9 shrink-0 rounded-full", isActive("/settings") && "ring-1 ring-border")}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/admin" title="Team dashboard" aria-label="Team dashboard" className="hidden md:block">
              <Button
                variant={isActive("/admin") ? "secondary" : "ghost"}
                size="icon"
                className={cn("h-9 w-9 shrink-0 rounded-full", isActive("/admin") && "ring-1 ring-border")}
              >
                <ShieldHalf className="h-4 w-4" />
              </Button>
            </Link>
            <UserMenu compact />
            <MobileNavSheet />
          </div>
        </div>
        {isMobile ? (
          <div className="flex flex-wrap items-center justify-center gap-2 border-t border-border/40 bg-muted/20 px-4 py-2 md:hidden">
            {SHOW_DEV_PRO_CHROME_PREVIEW ? <ProPreviewToggle compact /> : null}
            <PlanBrief />
          </div>
        ) : null}
      </header>

      <main className="mesh-bg flex-1">
        <div className="pointer-events-none fixed inset-0 -z-10 opacity-[0.35]">
          <div className="grid-bg absolute inset-0" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:py-12">{children}</div>
      </main>
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <PortfolioWorkspaceProvider>
      <AppLayoutShell>{children}</AppLayoutShell>
    </PortfolioWorkspaceProvider>
  );
}
