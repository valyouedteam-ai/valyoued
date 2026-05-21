import { useMemo, useState } from "react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import type { UseQueryOptions } from "@tanstack/react-query";
import type { EstimateSummary, PatchEstimateBodyIntent } from "@workspace/api-client-react";
import { listEstimates, useGetEstimateStats, useListEstimates } from "@workspace/api-client-react";
import {
  mergePortfolioHref,
  usePortfolioWorkspace,
} from "@/context/PortfolioWorkspaceContext";
import { formatPercent, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Briefcase,
  ChevronRight,
  FileText,
  Globe2,
  Megaphone,
  TrendingUp,
} from "lucide-react";

function inActiveWorkspace(
  e: EstimateSummary,
  activeId: string | null,
  primaryId: string | null,
): boolean {
  if (!activeId || !primaryId) return true;
  if (activeId === primaryId) return !e.portfolioId || e.portfolioId === primaryId;
  return e.portfolioId === activeId;
}

type IntentFilterKey = "all" | PatchEstimateBodyIntent | "unset";
type ShelfFilterKey = "all" | EstimateSummary["portfolioShelf"];

export default function HomePage() {
  const {
    portfolios,
    isLoading: portfoliosLoading,
    portfolioQuerySuffix,
    activePortfolio,
    primaryPortfolio,
    selectPortfolioById,
  } = usePortfolioWorkspace();

  const { data: estimates, isLoading: estLoading } = useListEstimates({
    query: {
      staleTime: 30_000,
    } as unknown as UseQueryOptions<Awaited<ReturnType<typeof listEstimates>>, Error>,
  });

  const { data: stats, isLoading: statsLoading } = useGetEstimateStats();

  const filtered = useMemo(() => {
    const rows = Array.isArray(estimates) ? estimates : [];
    const act = activePortfolio?.id ?? null;
    const prim = primaryPortfolio?.id ?? null;
    return rows.filter((e) => inActiveWorkspace(e, act, prim));
  }, [estimates, activePortfolio?.id, primaryPortfolio?.id]);

  const [intentFilter, setIntentFilter] = useState<IntentFilterKey>("all");
  const [shelfFilter, setShelfFilter] = useState<ShelfFilterKey>("all");
  const [pickedRegionIdx, setPickedRegionIdx] = useState<number | null>(null);

  const sortedRecent = useMemo(() => {
    return [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [filtered]);

  const displayedRecent = useMemo(() => {
    return sortedRecent.filter((e) => {
      if (shelfFilter !== "all" && e.portfolioShelf !== shelfFilter) return false;
      if (intentFilter === "all") return true;
      if (intentFilter === "unset") return !e.intent;
      return e.intent === intentFilter;
    });
  }, [sortedRecent, shelfFilter, intentFilter]);

  const quickLinks: Array<{
    href: string;
    title: string;
    description: string;
    icon: typeof Briefcase;
  }> = [
    {
      href: mergePortfolioHref("/portfolio", portfolioQuerySuffix),
      title: "Portfolio",
      description: "Holdings and shelf totals",
      icon: Briefcase,
    },
    {
      href: mergePortfolioHref("/estimates", portfolioQuerySuffix),
      title: "History",
      description: "Search and filters",
      icon: FileText,
    },
    {
      href: mergePortfolioHref("/markets", portfolioQuerySuffix),
      title: "Markets",
      description: "Regional mixes",
      icon: Globe2,
    },
    {
      href: mergePortfolioHref("/listings", portfolioQuerySuffix),
      title: "Ads",
      description: "Listing copy",
      icon: Megaphone,
    },
  ];

  function resetFilters() {
    setIntentFilter("all");
    setShelfFilter("all");
  }

  const primaryLabel = portfolios?.find((p) => p.purpose === "primary")?.label ?? null;

  return (
    <div className="space-y-10 pb-16">
      <header className="space-y-6">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Home</h1>
          {!portfoliosLoading && portfolios != null && portfolios.length > 1 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {portfolios.map((p) => {
                const focused = activePortfolio?.id === p.id;
                return (
                  <Button
                    key={p.id}
                    size="sm"
                    type="button"
                    variant={focused ? "default" : "outline"}
                    className="rounded-full"
                    aria-pressed={focused}
                    onClick={() => selectPortfolioById(p.id)}
                  >
                    {p.label ||
                      (p.purpose === "primary" ? primaryLabel ?? "Primary" : p.purpose === "pro_board" ? "Desk" : "Workspace")}
                  </Button>
                );
              })}
            </div>
          ) : portfoliosLoading ? (
            <Skeleton className="h-9 w-56 rounded-full" />
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Shelf</span>
            <ToggleGroup
              type="single"
              value={shelfFilter}
              variant="outline"
              size="sm"
              className="flex-wrap justify-start"
              onValueChange={(v) => {
                if (!v || v === "all") {
                  setShelfFilter("all");
                  return;
                }
                if (v === "everyday" || v === "luxury" || v === "other") setShelfFilter(v);
              }}
            >
              <ToggleGroupItem value="all" className="rounded-full px-3 text-xs">
                All shelves
              </ToggleGroupItem>
              <ToggleGroupItem value="everyday" className="rounded-full px-3 text-xs">
                Everyday
              </ToggleGroupItem>
              <ToggleGroupItem value="luxury" className="rounded-full px-3 text-xs">
                Luxury
              </ToggleGroupItem>
              <ToggleGroupItem value="other" className="rounded-full px-3 text-xs">
                Other
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Intent</span>
            <ToggleGroup
              type="single"
              value={intentFilter}
              variant="outline"
              size="sm"
              className="flex-wrap justify-start"
              onValueChange={(v) => {
                if (
                  v === "" ||
                  v === "all" ||
                  v === "sell" ||
                  v === "monitor" ||
                  v === "hold" ||
                  v === "unset"
                ) {
                  setIntentFilter(v === "" ? "all" : (v as IntentFilterKey));
                }
              }}
            >
              <ToggleGroupItem value="all" className="rounded-full px-3 text-xs">
                All
              </ToggleGroupItem>
              <ToggleGroupItem value="hold" className="rounded-full px-3 text-xs">
                Hold
              </ToggleGroupItem>
              <ToggleGroupItem value="monitor" className="rounded-full px-3 text-xs">
                Monitor
              </ToggleGroupItem>
              <ToggleGroupItem value="sell" className="rounded-full px-3 text-xs">
                Prep sell
              </ToggleGroupItem>
              <ToggleGroupItem value="unset" className="rounded-full px-3 text-xs">
                No intent
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map(({ href, title, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "group rounded-2xl border border-border/60 bg-card/55 p-4 shadow-sm backdrop-blur-sm transition-colors",
              "hover:border-accent/35 hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-1 font-medium leading-tight">
                  {title}
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <p className="text-xs leading-snug text-muted-foreground">{description}</p>
              </div>
            </div>
          </Link>
        ))}
      </section>

      <section>
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-2">
            <div>
              <CardTitle className="text-lg">
                Recent valuations ({displayedRecent.length}
                {(intentFilter !== "all" || shelfFilter !== "all") &&
                sortedRecent.length !== displayedRecent.length ? (
                  <span className="text-muted-foreground"> of {sortedRecent.length}</span>
                ) : null}
                )
              </CardTitle>
            </div>
            {(intentFilter !== "all" || shelfFilter !== "all") ? (
              <Button type="button" variant="ghost" size="sm" className="rounded-full text-xs" onClick={() => resetFilters()}>
                Clear filters
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            {estLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : displayedRecent.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                Nothing matches those filters yet.{" "}
                {(intentFilter !== "all" || shelfFilter !== "all") && (
                  <button type="button" className="font-medium text-accent underline-offset-4 hover:underline" onClick={resetFilters}>
                    Reset filters
                  </button>
                )}
                {intentFilter === "all" && shelfFilter === "all" && (
                  <>
                    {" "}
                    <Link
                      href={mergePortfolioHref("/estimate/new", portfolioQuerySuffix)}
                      className="font-medium text-accent underline-offset-4 hover:underline"
                    >
                      Run a valuation
                    </Link>
                    .
                  </>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-border/50 rounded-xl border border-border/60">
                {displayedRecent.map((e) => (
                  <li key={e.id}>
                    <div className="flex flex-col gap-2 px-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <Link
                        href={mergePortfolioHref(`/estimates/${e.id}`, portfolioQuerySuffix)}
                        className="min-w-0 flex-1 px-1 text-sm outline-none ring-offset-background transition-colors hover:text-accent focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-accent/40 sm:py-0.5"
                      >
                        <div className="truncate font-medium text-foreground">{e.title}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 truncate text-xs text-muted-foreground">
                          <span className="capitalize">{e.assetTypeName}</span>
                          <span className="rounded-full bg-muted px-2 py-px text-[10px] uppercase tracking-wide">{e.portfolioShelf}</span>
                          <span className="tabular-nums text-muted-foreground">
                            Adj. {formatMoney(e.adjustedMid, e.currency, true)}
                          </span>
                        </div>
                      </Link>
                      <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-muted-foreground sm:text-right">
                        {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe2 className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Regional mix</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              {statsLoading || !stats || !Number.isFinite(stats.averageUplift)
                ? "Tap a highlighted share bar. Typical uplift versus baseline fills in once you have enough saved runs."
                : (
                  <>
                    Tap a highlighted share bar. Average adjustment vs baseline is running about{" "}
                    <span className="font-semibold tabular-nums text-foreground">
                      {formatPercent(stats.averageUplift, true)}
                    </span>{" "}
                    across this workspace snapshot right now.
                  </>
                )}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {statsLoading ? (
              <Skeleton className="h-10 w-full rounded-xl" />
            ) : stats?.topArbitrageRegions?.length ? (
              (() => {
                const rows = stats.topArbitrageRegions;
                const total = rows.reduce((s, r) => s + (r.count ?? 0), 0) || 1;
                return (
                  <div className="space-y-3 text-sm">
                    {rows.slice(0, 4).map((r, idx) => {
                      const pct = (r.count ?? 0) / total;
                      const focused = pickedRegionIdx === idx;
                      return (
                        <button
                          key={`${r.region}-${idx}`}
                          type="button"
                          onClick={() => setPickedRegionIdx((i) => (i === idx ? null : idx))}
                          aria-pressed={focused}
                          className={cn(
                            "relative w-full overflow-hidden rounded-xl border px-4 py-2.5 text-left transition-colors",
                            "border-border/60 bg-muted/10 hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                            focused && "border-accent/50 bg-accent/10",
                          )}
                        >
                          <div
                            className="pointer-events-none absolute inset-y-0 left-0 bg-accent/20 transition-[width] duration-300"
                            style={{ width: `${Math.round(pct * 100)}%` }}
                          />
                          <span className="relative z-10 flex items-center justify-between gap-4">
                            <span className="truncate font-medium">{r.region}</span>
                            <span className="shrink-0 tabular-nums text-muted-foreground">{formatPercent(pct)}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })()
            ) : (
              <p className="text-sm text-muted-foreground">Regional spread fills in after you collect more valuations.</p>
            )}
            <Button variant="outline" className="w-full justify-between rounded-xl" asChild>
              <Link href={mergePortfolioHref("/markets", portfolioQuerySuffix)}>
                Open markets cockpit
                <TrendingUp className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Ads &amp; monitors</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">Shortcuts for ads you already surfaced in reports.</p>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" className="h-auto flex-col items-start rounded-2xl py-4 text-left" asChild>
              <Link href={mergePortfolioHref("/listings", portfolioQuerySuffix)}>
                <span className="text-sm font-semibold">Ads</span>
                <span className="text-xs text-muted-foreground">Copy blocks</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col items-start rounded-2xl py-4 text-left" asChild>
              <Link href={mergePortfolioHref("/settings", portfolioQuerySuffix)}>
                <span className="text-sm font-semibold">Email alerts</span>
                <span className="text-xs text-muted-foreground">Monitor pings</span>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
