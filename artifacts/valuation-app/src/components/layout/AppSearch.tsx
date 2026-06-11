import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { useLocation } from "wouter";
import { useListEstimates } from "@workspace/api-client-react";
import {
  Briefcase,
  Calculator,
  FileText,
  LayoutDashboard,
  Search,
  Settings,
  ShieldHalf,
  UserRound,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  mergePortfolioHref,
  usePortfolioWorkspace,
} from "@/context/PortfolioWorkspaceContext";
import { estimateInActiveWorkspace } from "@/lib/portfolio-workspace-scope";

type SearchNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  group: string;
  keywords?: string;
  locked?: boolean;
  skipPortfolioQuery?: boolean;
};

const WORKSPACE_PAGES: Omit<SearchNavItem, "group">[] = [
  { href: "/dashboard", label: "Portfolio", icon: Briefcase, keywords: "dashboard holdings collection" },
  { href: "/estimate/new", label: "Valuate", icon: Calculator, keywords: "new valuation estimate appraise" },
  {
    href: "/estimates",
    label: "Recent valuations",
    icon: LayoutDashboard,
    keywords: "history recent saved runs",
  },
];

const ACCOUNT_PAGES: Omit<SearchNavItem, "group">[] = [
  { href: "/settings", label: "Settings", icon: Settings, keywords: "account email billing privacy" },
  { href: "/profile", label: "Profile", icon: UserRound, keywords: "account user" },
  { href: "/admin", label: "Admin", icon: ShieldHalf, keywords: "administrator dashboard" },
];

function resolveSearchHref(item: Pick<SearchNavItem, "href" | "skipPortfolioQuery" | "locked">, portfolioQuerySuffix: string) {
  if (item.locked) return "/pricing#plans";
  if (item.skipPortfolioQuery || !portfolioQuerySuffix?.length) return item.href;
  return mergePortfolioHref(item.href, portfolioQuerySuffix);
}

function isMacPlatform() {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

export function AppSearch({
  insightNav,
  className,
}: {
  insightNav: Array<{
    href: string;
    label: string;
    icon: LucideIcon;
    navTitle?: string;
    locked?: boolean;
    skipPortfolioQuery?: boolean;
  }>;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const { portfolioQuerySuffix, activePortfolio, primaryPortfolio } = usePortfolioWorkspace();
  const { data: estimates } = useListEstimates();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const pageItems = useMemo(() => {
    const rows: SearchNavItem[] = [
      ...WORKSPACE_PAGES.map((item) => ({ ...item, group: "Workspace" })),
      ...insightNav.map((item) => ({
        href: item.href,
        label: item.label,
        icon: item.icon,
        group: "Insights",
        keywords: item.navTitle,
        locked: item.locked,
        skipPortfolioQuery: item.skipPortfolioQuery,
      })),
      ...ACCOUNT_PAGES.map((item) => ({ ...item, group: "Account" })),
    ];
    return rows.map((item) => ({
      ...item,
      href: resolveSearchHref(item, portfolioQuerySuffix),
    }));
  }, [insightNav, portfolioQuerySuffix]);

  const valuationItems = useMemo(() => {
    const rows = Array.isArray(estimates) ? estimates : [];
    const act = activePortfolio?.id ?? null;
    const prim = primaryPortfolio?.id ?? null;
    return rows
      .filter((e) => estimateInActiveWorkspace(e, act, prim))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 12)
      .map((e) => ({
        id: e.id,
        label: e.title,
        subtitle: e.assetTypeName,
        href: mergePortfolioHref(`/estimates/${e.id}`, portfolioQuerySuffix),
      }));
  }, [estimates, activePortfolio?.id, primaryPortfolio?.id, portfolioQuerySuffix]);

  const shortcutLabel = isMacPlatform() ? "⌘K" : "Ctrl K";

  function go(href: string) {
    setOpen(false);
    navigate(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-xl border border-border/70 bg-card/60 px-3 text-sm text-muted-foreground shadow-sm transition-colors",
          "hover:border-accent/35 hover:bg-card/85 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
          className,
        )}
        aria-label="Search pages and valuations"
      >
        <Search className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-left">Search pages and valuations…</span>
        <kbd className="hidden rounded-md border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
          {shortcutLabel}
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <DialogTitle className="sr-only">Search pages and valuations</DialogTitle>
        <CommandInput placeholder="Search pages and valuations…" />
        <CommandList>
          <CommandEmpty>No matches found.</CommandEmpty>
          {(["Workspace", "Insights", "Account"] as const).map((group) => {
            const items = pageItems.filter((item) => item.group === group);
            if (items.length === 0) return null;
            return (
              <CommandGroup key={group} heading={group}>
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={`${group}:${item.href}:${item.label}`}
                      value={[item.label, item.keywords, group].filter(Boolean).join(" ")}
                      onSelect={() => go(item.href)}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                      <span>{item.label}</span>
                      {item.locked ? (
                        <CommandShortcut>Upgrade</CommandShortcut>
                      ) : null}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            );
          })}
          {valuationItems.length > 0 ? (
            <CommandGroup heading="Valuations">
              {valuationItems.map((item) => (
                <CommandItem
                  key={item.id}
                  value={[item.label, item.subtitle, "valuation estimate report"].join(" ")}
                  onSelect={() => go(item.href)}
                >
                  <FileText className="h-4 w-4" aria-hidden />
                  <div className="min-w-0">
                    <div className="truncate">{item.label}</div>
                    <div className="truncate text-xs text-muted-foreground">{item.subtitle}</div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
        </CommandList>
      </CommandDialog>
    </>
  );
}
