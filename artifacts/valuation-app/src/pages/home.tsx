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
import { portfolioWorkspaceButtonLabel } from "@/components/layout/PortfolioWorkspaceStrip";
import { formatPercent, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  BellRing,
  Briefcase,
  Calculator,
  Car,
  ChevronRight,
  FileText,
  Gem,
  Globe2,
  Lock,
  Megaphone,
  Package,
  Palette,
  Shirt,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  TvMinimal,
  Watch,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useSellerPersona } from "@/hooks/use-seller-persona";
import { useBillingSummary } from "@/hooks/use-billing-summary";
import type { HomeBucketKey } from "@/lib/home-buckets";
import { HOME_BUCKET_LABEL, HOME_BUCKET_ORDER, bucketForAssetTypeName, countItemsByBucket } from "@/lib/home-buckets";
import { PaidFeatureTeaser } from "@/components/home/PaidFeatureTeaser";

function inActiveWorkspace(e: EstimateSummary, activeId: string | null, primaryId: string | null): boolean {
  if (!activeId || !primaryId) return true;
  if (activeId === primaryId) return !e.portfolioId || e.portfolioId === primaryId;
  return e.portfolioId === activeId;
}

type IntentFilterKey = "all" | PatchEstimateBodyIntent | "unset";
type ShelfFilterKey = "all" | EstimateSummary["portfolioShelf"];

const BUCKET_ICONS: Record<HomeBucketKey, typeof Gem> = {
  jewellery: Watch,
  luxuryBags: ShoppingBag,
  cars: Car,
  electronics: TvMinimal,
  antiques: Palette,
  clothing: Shirt,
  collectibles: Sparkles,
  other: Package,
};

export default function HomePage() {
  const reduceMotion = useReducedMotion();
  const { headlineForHome, sublineForHome, isProfessional } = useSellerPersona();
  const { data: billing } = useBillingSummary();
  const billingPaid = Boolean(billing?.hasPaidValuationTier);

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

  const bucketCounts = useMemo(() => countItemsByBucket(filtered.map((f) => f.assetTypeName)), [filtered]);

  const [intentFilter, setIntentFilter] = useState<IntentFilterKey>("all");
  const [shelfFilter, setShelfFilter] = useState<ShelfFilterKey>("all");
  const [pickedRegionIdx, setPickedRegionIdx] = useState<number | null>(null);
  const [recentOpen, setRecentOpen] = useState(true);

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

  const primaryLabel = portfolios?.find((p) => p.purpose === "primary")?.label ?? null;

  const showingInheritanceUpsell = !isProfessional && !billing?.hasInheritanceAddon;

  const quickLinks: Array<{
    href: string;
    title: string;
    description: string;
    icon: typeof Briefcase;
  }> = isProfessional
    ? [
        {
          href: mergePortfolioHref("/portfolio", portfolioQuerySuffix),
          title: "Desk portfolio",
          description: "Stock lanes and class mix",
          icon: Briefcase,
        },
        {
          href: mergePortfolioHref("/estimate/new", portfolioQuerySuffix),
          title: "New valuation",
          description: "Run another comp pass",
          icon: Calculator,
        },
        {
          href: mergePortfolioHref("/listings", portfolioQuerySuffix),
          title: "Ads workspace",
          description: "Listing drafts you can ship",
          icon: Megaphone,
        },
        {
          href: mergePortfolioHref("/settings", portfolioQuerySuffix),
          title: "Billing & alerts",
          description: "Trials, monitors, email",
          icon: BellRing,
        },
      ]
    : [
        {
          href: mergePortfolioHref("/portfolio", portfolioQuerySuffix),
          title: "Full portfolio",
          description: "Net worth mix and shelves",
          icon: Briefcase,
        },
        {
          href: mergePortfolioHref("/estimate/new", portfolioQuerySuffix),
          title: "Add an item",
          description: "Kick off valuation wizard",
          icon: Calculator,
        },
        {
          href: mergePortfolioHref("/listings", portfolioQuerySuffix),
          title: "Ad drafting",
          description: "Polish resale copy fast",
          icon: Megaphone,
        },
        {
          href: mergePortfolioHref("/settings", portfolioQuerySuffix),
          title: "Subscription",
          description: "Upgrade Everyday+ perks",
          icon: Globe2,
        },
      ];

  function resetFilters() {
    setIntentFilter("all");
    setShelfFilter("all");
  }

  const hasAnyItems = filtered.length > 0;

  return (
    <div className="space-y-10 pb-16">
      <header className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{headlineForHome}</h1>
          <p className="w-full max-w-none whitespace-nowrap overflow-x-auto overscroll-x-contain text-base leading-relaxed text-muted-foreground">
            {sublineForHome}
          </p>
        </div>
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
                  className={cn(
                    "rounded-full",
                    focused && p.purpose === "inheritance"
                      ? "bg-violet-600 text-white hover:bg-violet-600 dark:bg-violet-600 dark:hover:bg-violet-600"
                      : null,
                    focused && p.purpose === "pro_board"
                      ? "bg-teal-700 text-white hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-600"
                      : null,
                    !focused && p.purpose === "inheritance"
                      ? "border-violet-400/55 text-violet-900 hover:bg-violet-500/10 dark:text-violet-200 dark:hover:bg-violet-500/15"
                      : null,
                    !focused && p.purpose === "pro_board"
                      ? "border-teal-500/45 text-teal-900 hover:bg-teal-500/10 dark:text-teal-200 dark:hover:bg-teal-500/15"
                      : null,
                  )}
                  aria-pressed={focused}
                  onClick={() => selectPortfolioById(p.id)}
                >
                  {portfolioWorkspaceButtonLabel(p, primaryLabel)}
                </Button>
              );
            })}
          </div>
        ) : portfoliosLoading ? (
          <Skeleton className="h-9 w-56 rounded-full" />
        ) : null}

        {!hasAnyItems ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            className="rounded-3xl border border-dashed border-accent/40 bg-accent/5 px-5 py-5 sm:px-6"
          >
            <p className="text-sm font-medium text-foreground">Start by valuing anything you actually own.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Empty buckets below light up automatically once you capture a valuation. Guest users can rehearse inside{" "}
              <Link href="/start" className="font-medium text-accent underline-offset-4 hover:underline">
                /start
              </Link>
              , then attach items to your signed-in workspaces.
            </p>
            <div className="mt-4">
              <Button asChild className="rounded-full">
                <Link href={mergePortfolioHref("/estimate/new", portfolioQuerySuffix)}>Run my first valuation</Link>
              </Button>
            </div>
          </motion.div>
        ) : null}
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

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Asset buckets</h2>
            <p className="text-sm text-muted-foreground">Counts follow the asset class label on each saved run.</p>
          </div>
          <Button size="sm" variant="secondary" className="rounded-full" asChild>
            <Link href={mergePortfolioHref("/estimate/new", portfolioQuerySuffix)}>Add item</Link>
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {HOME_BUCKET_ORDER.map((key) => {
            const Icon = BUCKET_ICONS[key];
            const count = bucketCounts[key];
            const empty = count === 0;
            return (
              <motion.div
                key={key}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
                whileInView={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-5%" }}
                transition={{ duration: 0.3 }}
              >
                <Link
                  href={mergePortfolioHref("/portfolio", portfolioQuerySuffix)}
                  className={cn(
                    "block rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm backdrop-blur-sm transition-colors",
                    "hover:border-accent/35 hover:bg-card/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-snug text-foreground">{HOME_BUCKET_LABEL[key]}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-semibold tabular-nums text-foreground">{count}</span>
                        <span className="text-xs uppercase tracking-[0.1em] text-muted-foreground">items</span>
                      </div>
                      <p className={cn("text-xs", empty ? "text-accent" : "text-muted-foreground")}>
                        {empty
                          ? "Tap Portfolio to organise once you capture something here."
                          : `${count} valuation${count === 1 ? "" : "s"} tagged like ${HOME_BUCKET_LABEL[key].toLowerCase()}.`}
                      </p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {billingPaid ? (
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
        ) : (
          <PaidFeatureTeaser
            eyebrow="Paid unlock"
            title="International arbitrage stack"
            description="Everyday+ opens the fuller regional payout grids on each valuation alongside the markets cockpit previews you already skim."
          />
        )}

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Ads &amp; monitors</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Everyday Free still drafts humane ads. Alerts for monitored holdings unlock with Everyday+.
            </p>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" className="h-auto flex-col items-start rounded-2xl py-4 text-left" asChild>
              <Link href={mergePortfolioHref("/listings", portfolioQuerySuffix)}>
                <span className="text-sm font-semibold">Ads</span>
                <span className="text-xs text-muted-foreground">Copy blocks</span>
              </Link>
            </Button>
            {billingPaid ? (
              <Button variant="outline" className="h-auto flex-col items-start rounded-2xl py-4 text-left" asChild>
                <Link href={mergePortfolioHref("/settings", portfolioQuerySuffix)}>
                  <span className="text-sm font-semibold">Email alerts</span>
                  <span className="text-xs text-muted-foreground">Monitor pings</span>
                </Link>
              </Button>
            ) : (
              <div className="relative overflow-hidden rounded-2xl border border-dashed border-border/70 p-4 text-left">
                <div className="pointer-events-none absolute inset-0 bg-background/70 backdrop-blur-sm" aria-hidden />
                <div className="relative space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Lock className="h-4 w-4 text-accent" />
                    Email monitor alerts
                  </div>
                  <p className="text-xs text-muted-foreground">Holdings tagged monitor can ping you after upgrade.</p>
                  <Button size="sm" variant="secondary" className="w-full rounded-lg" asChild>
                    <Link href="/settings">Unlock with Everyday+</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-2xl border border-border/60 bg-card/50 px-4 py-3 text-left text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-card/80"
          onClick={() => setRecentOpen((o) => !o)}
          aria-expanded={recentOpen}
        >
          <span className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Recent valuations ({displayedRecent.length}
            {(intentFilter !== "all" || shelfFilter !== "all") && sortedRecent.length !== displayedRecent.length ? (
              <span className="font-normal text-muted-foreground"> of {sortedRecent.length}</span>
            ) : null}
            )
          </span>
          <ChevronRight className={cn("h-4 w-4 transition-transform", recentOpen && "rotate-90")} />
        </button>

        {recentOpen ? (
          <div className="space-y-4">
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

            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-2">
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
                              <span>{HOME_BUCKET_LABEL[bucketForAssetTypeName(e.assetTypeName)]}</span>
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
          </div>
        ) : null}
      </section>

      {showingInheritanceUpsell ? (
        <PaidFeatureTeaser
          eyebrow="Everyday steward boost"
          title="Separate inheritance ledger"
          description="Activate the add-on in Settings to spin up a second workspace for estate rehearsal, heirs, or heirloom tracking."
          href="/settings"
        />
      ) : null}
    </div>
  );
}
