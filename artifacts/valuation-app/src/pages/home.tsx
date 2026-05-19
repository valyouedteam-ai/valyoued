import { useMemo } from "react";
import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import type { UseQueryOptions } from "@tanstack/react-query";
import type { EstimateSummary } from "@workspace/api-client-react";
import {
  listEstimates,
  useGetEstimateStats,
  useGetFxRates,
  getGetFxRatesQueryKey,
  useListEstimates,
} from "@workspace/api-client-react";
import { convertToUsdApprox } from "@workspace/fx-usd";
import { useDisplayCurrency } from "@/hooks/use-display-currency";
import { useBillingSummary } from "@/hooks/use-billing-summary";
import { useSellerPersonaClerkSync } from "@/hooks/use-persona-sync";
import {
  mergePortfolioHref,
  usePortfolioWorkspace,
} from "@/context/PortfolioWorkspaceContext";
import { formatUsdRollupForDisplay } from "@/lib/aggregated-money";
import { formatMoney, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calculator,
  ChevronRight,
  Globe2,
  Layers,
  Lock,
  Megaphone,
  Sparkles,
  TrendingUp,
} from "lucide-react";

type Shelf = EstimateSummary["portfolioShelf"];

const SHELF_SECTION_META: Record<Shelf, { title: string; description: string }> = {
  luxury: {
    title: "Luxury & collectibles",
    description: "Watches, signed bags, jewels — the luxury shelf.",
  },
  everyday: {
    title: "Everyday & tech",
    description: "Mass-market staples, closets, rigs.",
  },
  other: {
    title: "Other holdings",
    description: "Autos, antiques, hybrid runs.",
  },
};

const DONUT_PALETTE = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#ef4444",
  "#6366f1",
];

function inActiveWorkspace(
  e: EstimateSummary,
  activeId: string | null,
  primaryId: string | null,
): boolean {
  if (!activeId || !primaryId) return true;
  if (activeId === primaryId) return !e.portfolioId || e.portfolioId === primaryId;
  return e.portfolioId === activeId;
}

function ShelfBucket({
  shelf,
  count,
  portfolioQuerySuffix,
}: {
  shelf: Shelf;
  count: number;
  portfolioQuerySuffix: string;
}) {
  const reduceMotion = useReducedMotion();
  const meta = SHELF_SECTION_META[shelf];
  const empty = count === 0;
  return (
    <motion.div
      layout
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={reduceMotion ? false : { opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "relative rounded-2xl border border-border/60 bg-card/65 p-4 shadow-sm backdrop-blur-sm overflow-hidden min-h-[120px]",
        empty && "border-dashed",
      )}
    >
      {!reduceMotion && empty ? (
        <div className="pointer-events-none absolute inset-2 rounded-xl bg-accent/5 opacity-75 animate-pulse" />
      ) : null}
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-medium leading-tight">{meta.title}</div>
            <p className="text-xs text-muted-foreground mt-1 leading-snug">{meta.description}</p>
          </div>
          <Badge variant={empty ? "secondary" : "default"}>{count}</Badge>
        </div>
        {!empty ? (
          <Link
            href={mergePortfolioHref("/estimate/new", portfolioQuerySuffix)}
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
          >
            Add another asset
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <p className="text-[11px] text-muted-foreground mt-3">Seed this bucket with your next valuation.</p>
        )}
      </div>
    </motion.div>
  );
}

export default function HomePage() {
  useSellerPersonaClerkSync();

  const { code: displayCcy } = useDisplayCurrency();
  const { data: billing } = useBillingSummary();
  const paid = billing?.hasPaidValuationTier;
  const slug = billing?.planSlug ?? "none";
  const isProfessionalFlavor = slug === "professional";

  const { portfolioQuerySuffix, activePortfolio, primaryPortfolio } = usePortfolioWorkspace();
  const { data: estimates, isLoading: estLoading } = useListEstimates({
    query: {
      staleTime: 30_000,
    } as unknown as UseQueryOptions<Awaited<ReturnType<typeof listEstimates>>, Error>,
  });

  const { data: stats, isLoading: statsLoading } = useGetEstimateStats();
  const { data: fxSnap } = useGetFxRates({
    query: {
      queryKey: getGetFxRatesQueryKey(),
      staleTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  });
  const fxMult = fxSnap?.rates;

  const filtered = useMemo(() => {
    const rows = Array.isArray(estimates) ? estimates : [];
    const act = activePortfolio?.id ?? null;
    const prim = primaryPortfolio?.id ?? null;
    return rows.filter((e) => inActiveWorkspace(e, act, prim));
  }, [estimates, activePortfolio?.id, primaryPortfolio?.id]);

  const countsByShelf = useMemo(() => {
    const tally: Record<Shelf, number> = { luxury: 0, everyday: 0, other: 0 };
    for (const e of filtered) {
      const k = e.portfolioShelf ?? "other";
      if (k in tally) tally[k]++;
      else tally.other++;
    }
    return tally;
  }, [filtered]);

  const donutData = useMemo(() => {
    return (Object.entries(countsByShelf) as Array<[Shelf, number]>)
      .filter(([, c]) => c > 0)
      .map(([name, value]) => ({ name: SHELF_SECTION_META[name].title, value }));
  }, [countsByShelf]);

  const totalAdjustedUsdFiltered = useMemo(() => {
    return filtered.reduce(
      (s, e) => s + convertToUsdApprox(e.adjustedMid, e.currency, fxMult),
      0,
    );
  }, [filtered, fxMult]);

  const displayTotal = formatUsdRollupForDisplay(totalAdjustedUsdFiltered, displayCcy, fxMult);
  const workspaceLabel =
    activePortfolio?.label ??
    (activePortfolio?.purpose === "inheritance"
      ? "Inheritance ledger"
      : activePortfolio?.purpose === "pro_board"
        ? "Professional desk"
        : "Primary portfolio");

  return (
    <div className="space-y-10 pb-16">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            <Badge variant="outline" className="rounded-full px-3 py-0.5">
              Workspace
            </Badge>
            <span className="text-foreground/80">{workspaceLabel}</span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Portfolio command center
          </h1>
          <p className="text-pretty leading-relaxed text-muted-foreground">
            {isProfessionalFlavor
              ? "Track shelf mix across desks without losing granular ledgers inside each workspace."
              : "Shelf buckets summarise dossiers you've created, shortcuts keep valuations fast, and upgrade tiles mirror billing."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="lg" className="rounded-full shadow-lg" asChild>
            <Link href={mergePortfolioHref("/estimate/new", portfolioQuerySuffix)}>
              <Calculator className="mr-2 h-5 w-5" />
              New valuation
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="rounded-full" asChild>
            <Link href={mergePortfolioHref("/portfolio", portfolioQuerySuffix)}>Deep portfolio view</Link>
          </Button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Estimated value pulse</CardTitle>
            <CardDescription>Converted via shared FX snapshots into {displayCcy}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {statsLoading || estLoading ? (
              <Skeleton className="h-12 w-48" />
            ) : filtered.length === 0 ? (
              <div className="text-sm leading-relaxed text-muted-foreground">
                No dossiers in this workspace yet. Fire a valuation to seed your donut and tally.
              </div>
            ) : (
              <>
                <div className="text-4xl font-semibold tabular-nums text-foreground">{displayTotal}</div>
                <div className="mt-3 text-xs text-muted-foreground">
                  Approximate sum of adjusted midpoints converted with the same FX table as Portfolio.
                </div>
                <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                  Workspace contains {filtered.length} {filtered.length === 1 ? "asset" : "assets"}.
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/65 backdrop-blur-sm md:col-span-2 overflow-hidden relative">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg">Shelf mix</CardTitle>
            <CardDescription>Luxury vs everyday vs other dossiers inside this workspace.</CardDescription>
          </CardHeader>
          <CardContent className="h-[220px] pt-4">
            {estLoading ? (
              <Skeleton className="h-full w-full rounded-xl" />
            ) : donutData.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-4 text-center text-sm text-muted-foreground">
                Add valuations to illuminate this donut.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} dataKey="value" cx="45%" cy="50%" outerRadius={88} stroke="hsl(var(--border))">
                    {donutData.map((_, i) => (
                      <Cell key={`slice-${i}`} fill={DONUT_PALETTE[i % DONUT_PALETTE.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: number) => [`${value} assets`, "Count"]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {(Object.keys(countsByShelf) as Shelf[]).map((shelf) => (
          <ShelfBucket
            key={shelf}
            shelf={shelf}
            count={countsByShelf[shelf]}
            portfolioQuerySuffix={portfolioQuerySuffix}
          />
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className={cn(!paid && "relative overflow-hidden")}>
          {!paid ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-md">
              <Lock className="h-8 w-8 text-accent" aria-hidden />
              <p className="max-w-[18rem] text-center text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                International arbitrage previews require Everyday+ or Professional
              </p>
              <Button asChild size="sm">
                <Link href={mergePortfolioHref("/settings", portfolioQuerySuffix)}>See billing</Link>
              </Button>
            </div>
          ) : null}
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe2 className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Regional markets cockpit</CardTitle>
            </div>
            <CardDescription>Anchored against your dossier mix — open markets for fuller tables.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {statsLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : stats?.topArbitrageRegions?.length ? (
              (() => {
                const rows = stats.topArbitrageRegions;
                const total = rows.reduce((s, r) => s + (r.count ?? 0), 0) || 1;
                return (
                  <div className="space-y-2 text-sm">
                    {rows.slice(0, 4).map((r) => (
                      <div key={r.region} className="flex items-center justify-between gap-4">
                        <span className="truncate text-muted-foreground">{r.region}</span>
                        <span className="tabular-nums font-medium">
                          {formatPercent((r.count ?? 0) / total)}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()
            ) : (
              <p className="text-sm text-muted-foreground">Regional spread appears after more dossiers land.</p>
            )}
            <Button variant="outline" className="w-full justify-between rounded-xl" asChild>
              <Link href={mergePortfolioHref("/markets", portfolioQuerySuffix)}>
                Dive into markets
                <TrendingUp className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className={cn(!paid && "relative overflow-hidden")}>
          {!paid ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-md">
              <Sparkles className="h-8 w-8 text-accent" aria-hidden />
              <p className="max-w-[18rem] text-center text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Monitor intents + paid-tier listing tone unlock with Everyday+
              </p>
              <Button asChild size="sm">
                <Link href={mergePortfolioHref("/settings", portfolioQuerySuffix)}>Enable perks</Link>
              </Button>
            </div>
          ) : null}
          <CardHeader>
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Monitor & monetize rails</CardTitle>
            </div>
            <CardDescription>Listing drafts · monitor intents · email knobs.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" className="h-auto flex-col items-start rounded-2xl py-4 text-left" asChild>
              <Link href={mergePortfolioHref("/listings", portfolioQuerySuffix)}>
                <span className="text-sm font-semibold">Listing drafts</span>
                <span className="text-xs text-muted-foreground">Marketplace wording</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col items-start rounded-2xl py-4 text-left" asChild>
              <Link href={mergePortfolioHref("/settings", portfolioQuerySuffix)}>
                <span className="text-sm font-semibold">Email alerts</span>
                <span className="text-xs text-muted-foreground">Tune monitor emails</span>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="border-accent/25 bg-accent/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-accent" />
              <CardTitle>Momentum telemetry</CardTitle>
            </div>
            <CardDescription>Across every workspace you own (not scoped to inheritance filters).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="flex justify-between gap-4">
              <span>Total dossiers saved</span>
              <strong className="tabular-nums text-foreground">{statsLoading ? "—" : stats?.count ?? 0}</strong>
            </div>
            <div className="flex justify-between gap-4">
              <span>Mean uplift</span>
              <strong className="tabular-nums text-foreground">
                {statsLoading || stats == null ? "—" : formatPercent(stats.averageUplift ?? 0)}
              </strong>
            </div>
            <div className="flex justify-between gap-4">
              <span>Mean baseline (USD)</span>
              <strong className="tabular-nums text-foreground">
                {statsLoading || stats == null
                  ? "—"
                  : formatMoney(stats.averageBaselineUsd ?? 0, "USD")}
              </strong>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <CardTitle>Workspace hygiene</CardTitle>
            <CardDescription>Separate inheritance ledgers, professional boards, or stay on primary.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" asChild className="rounded-full">
              <Link href={mergePortfolioHref("/settings", portfolioQuerySuffix)} className="flex items-center gap-2">
                Manage billing &amp; workspaces
                <Sparkles className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
